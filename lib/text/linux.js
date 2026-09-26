const GTKLabel = require('bare-gtk/label')
const { measureMarkup } = require('bare-gtk/text')
const {
  JUSTIFY_CENTER,
  JUSTIFY_FILL,
  JUSTIFY_LEFT,
  JUSTIFY_RIGHT,
  WRAP_WORD_CHAR
} = require('bare-gtk/constants')
const { constants } = require('bare-yoga')

const NativeTextNode = require('../text-node')
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

    this._native = new GTKLabel()

    // Yoga owns the box, so the label wraps into it rather than settling on a
    // width of its own, and sits at its top left corner.
    this._native.wrap = true
    this._native.wrapMode = WRAP_WORD_CHAR
    this._native.xalign = 0
    this._native.yalign = 0

    this._markup = ''
    this._lineHeight = undefined

    this._layout.measure = this._onmeasure.bind(this)

    this._apply()
  }

  _onmeasure(width, widthMode, height, heightMode) {
    const available = widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : width

    const measured = measureMarkup(this._markup, available)

    return { width: measured.width + this._trailing, height: measured.height }
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

    this._native.setMarkup(this._markup)

    this._layout.markDirty()
  }

  _paint(properties) {
    const changed = this._inherit(properties)

    if ('textAlign' in properties) {
      const [xalign, justify] = ALIGNMENT[properties.textAlign] || ALIGNMENT.natural

      this._native.xalign = xalign
      this._native.justify = justify
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
