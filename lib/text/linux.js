const GTKFrameFixed = require('bare-gtk/frame-fixed')
const GTKLabel = require('bare-gtk/label')
const { measureMarkup } = require('bare-gtk/text')
const {
  JUSTIFY_CENTER,
  JUSTIFY_FILL,
  JUSTIFY_LEFT,
  JUSTIFY_RIGHT,
  WRAP_WORD_CHAR,
  ELLIPSIZE_END,
  ELLIPSIZE_NONE,
  OVERFLOW_HIDDEN,
  OVERFLOW_VISIBLE
} = require('bare-gtk/constants')
const { constants } = require('bare-yoga')

const NativeTextNode = require('../text-node')
const Paint = require('../paint/linux')
const style = require('../style')

// Pango counts a thousand and twenty-four of these to the point.
const SCALE = 1024

// GTK splits what CSS calls text alignment in two: where the lines sit in the
// box, and how a wrapped line fills it.
const ALIGNMENT = {
  left: [0, JUSTIFY_LEFT],
  center: [0.5, JUSTIFY_CENTER],
  right: [1, JUSTIFY_RIGHT],
  justify: [0, JUSTIFY_FILL],
  natural: [0, JUSTIFY_LEFT]
}

// Pango names the weights CSS numbers, and a font description string is where
// a family, a weight, a slant and a size are said together.
const WEIGHTS = [
  'Thin',
  'Ultra-Light',
  'Light',
  'Regular',
  'Medium',
  'Semi-Bold',
  'Bold',
  'Ultra-Bold',
  'Heavy'
]

function description({ fontFamily, fontSize, fontWeight, fontStyle }) {
  const parts = []

  // The comma ends the family list, which is what keeps a family named after a
  // style word from being read as one.
  if (fontFamily !== undefined && fontFamily !== null) parts.push(`${fontFamily},`)

  parts.push(
    WEIGHTS[Math.min(Math.max(Math.round((style.weight(fontWeight) || 400) / 100), 1), 9) - 1]
  )

  if (style.italic(fontStyle)) parts.push('Italic')

  // A size in device units, which is what every other length here is. A size
  // left out leaves the label's own, which is what a description says by not
  // carrying one.
  if (fontSize !== undefined) parts.push(`${fontSize}px`)

  return parts.join(' ')
}

function hex(value) {
  return Math.round(value * 255)
    .toString(16)
    .padStart(2, '0')
}

const ESCAPED = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }

function escape(text) {
  return text.replace(/[&<>"]/g, (character) => ESCAPED[character])
}

function span(run) {
  const attributes = [`font_desc="${escape(description(run.style))}"`]

  // Pango counts the space between characters in its own units, as it counts
  // everything else.
  if (run.style.letterSpacing !== undefined) {
    attributes.push(`letter_spacing="${Math.round(run.style.letterSpacing * SCALE)}"`)
  }

  // Pango spells the two lines as two attributes, as Apple does.
  const lines = style.decoration(run.style.textDecorationLine)

  if (lines.includes('underline')) attributes.push('underline="single"')
  if (lines.includes('line-through')) attributes.push('strikethrough="true"')

  if (run.style.color !== undefined) {
    const { red, green, blue, alpha } = style.color(run.style.color)

    attributes.push(`foreground="#${hex(red)}${hex(green)}${hex(blue)}"`)

    if (alpha < 1) attributes.push(`alpha="${Math.max(Math.round(alpha * 65535), 1)}"`)
  }

  return `<span ${attributes.join(' ')}>${escape(run.text)}</span>`
}

module.exports = class NativeText extends NativeTextNode {
  constructor(text = '') {
    super(text)

    // A widget clips at its own edge and a label's edge takes in its padding,
    // so a label given the whole box cannot be cut at a line. The label sits
    // in a box that paints and is placed at the padding, which is the shape
    // the other four take for the same reason.
    this._text = new GTKLabel()

    this._native = new GTKFrameFixed()

    this._manager = this._native.layoutManager

    this._text.insertBefore(this._native, null)

    this._child = this._manager.getLayoutChild(this._text)

    this._painter = new Paint(this._native)

    // Yoga owns the box, so the label wraps into it rather than settling on a
    // width of its own, and sits at its top left corner.
    this._text.wrap = true
    this._text.wrapMode = WRAP_WORD_CHAR
    this._text.xalign = 0
    this._text.yalign = 0

    this._markup = ''
    this._lineHeight = undefined

    this._layout.measure = this._onmeasure.bind(this)

    this._apply()
  }

  _onmeasure(width, widthMode, height, heightMode) {
    const available = widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : width

    const measured = measureMarkup(this._markup, available)

    return {
      width: measured.width + this._trailing,
      height: this._capped(measured.lines, measured.height)
    }
  }

  // The label draws the same markup the measurement lays out, which is one
  // description of the text rather than a stylesheet and a font beside it. A
  // line height is a Pango attribute like any other, in Pango units, and it
  // belongs to the paragraph rather than a run, so it wraps the whole of it.
  _apply() {
    const runs = this._runs.map(span).join('')

    this._markup =
      this._lineHeight === undefined
        ? runs
        : `<span line_height="${Math.round(this._lineHeight * SCALE)}">${runs}</span>`

    this._text.setMarkup(this._markup)

    this._layout.markDirty()
  }

  // GTK draws a background out to the border box and a padding inside it, as
  // CSS does, so this is one more declaration in the same stylesheet.
  // The box is the node's and the label is placed inside it, so the padding
  // insets the text and the clip lands on the text rather than past it.
  _resized(width, height) {
    const { top, right, bottom, left } = this._padding

    this._child.frame = [
      left,
      top,
      Math.max(0, width - left - right),
      Math.max(0, height - top - bottom)
    ]
  }

  // A label counts its lines only when it is allowed to ellipsize, so a cut
  // with no mark is not a count it will keep: what holds it to the box is the
  // box clipping the lines that do not fit.
  _truncated(lines, mode) {
    this._text.ellipsize = lines === 0 || mode === 'clip' ? ELLIPSIZE_NONE : ELLIPSIZE_END
    this._text.lines = lines === 0 ? -1 : lines

    this._clip()

    this._layout.markDirty()
  }

  // Cutting with no mark is the label's own box clipping what will not fit,
  // which is exact now that the box is the text and nothing else.
  _clip() {
    const cutting = this._numberOfLines !== 0 && this._ellipsizeMode === 'clip'

    this._text.overflow = cutting ? OVERFLOW_HIDDEN : OVERFLOW_VISIBLE
  }

  _paint(properties) {
    this._painter.apply(properties)

    this._clip()

    const changed = this._inherit(properties)

    if ('textAlign' in properties) {
      const [xalign, justify] = ALIGNMENT[properties.textAlign] || ALIGNMENT.natural

      this._text.xalign = xalign
      this._text.justify = justify
    }

    if ('lineHeight' in properties) {
      this._lineHeight = properties.lineHeight

      return this._apply()
    }

    if (changed) this._apply()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeText }
    }
  }
}
