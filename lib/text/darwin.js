const AppKit = require('bare-app-kit')
const { Framesetter } = require('bare-core-text')
const { constants } = require('bare-yoga')

const NativeTextNode = require('../text-node')
const style = require('../style')

const { Color, Font, FontDescriptor } = AppKit

const ALIGNMENT = {
  left: AppKit.Text.ALIGNMENT.LEFT,
  center: AppKit.Text.ALIGNMENT.CENTER,
  right: AppKit.Text.ALIGNMENT.RIGHT,
  justify: AppKit.Text.ALIGNMENT.JUSTIFIED,
  natural: AppKit.Text.ALIGNMENT.NATURAL
}

// Apple names nine weights and CSS numbers nine, so the two line up.
const WEIGHTS = [
  Font.WEIGHT.ULTRA_LIGHT,
  Font.WEIGHT.THIN,
  Font.WEIGHT.LIGHT,
  Font.WEIGHT.REGULAR,
  Font.WEIGHT.MEDIUM,
  Font.WEIGHT.SEMIBOLD,
  Font.WEIGHT.BOLD,
  Font.WEIGHT.HEAVY,
  Font.WEIGHT.BLACK
]

const DEFAULT_FONT_SIZE = 13

const CACHE_LIMIT = 4096

const fonts = new Map()

// A family has only the faces it was drawn with, and a descriptor can ask for
// no more than the bold one, which is what CSS calls 600 and up. The system
// font is the one case where every weight exists.
function font({ fontFamily, fontSize, fontWeight, fontStyle }) {
  const family = fontFamily === undefined ? null : fontFamily
  const size = fontSize === undefined ? DEFAULT_FONT_SIZE : fontSize
  const weight = style.weight(fontWeight) || 400
  const italic = style.italic(fontStyle)

  const key = `${family}\u0000${size}\u0000${weight}\u0000${italic}`

  let resolved = fonts.get(key)

  if (resolved !== undefined) return resolved

  resolved =
    family === null
      ? Font.systemFont(size, WEIGHTS[Math.min(Math.max(Math.round(weight / 100), 1), 9) - 1])
      : Font.withName(family, size) || Font.systemFont(size)

  let traits = 0

  if (italic) traits |= FontDescriptor.TRAIT.ITALIC
  if (family !== null && weight >= 600) traits |= FontDescriptor.TRAIT.BOLD

  if (traits !== 0) {
    resolved = Font.withDescriptor(resolved.fontDescriptor.withSymbolicTraits(traits), size)
  }

  if (fonts.size === CACHE_LIMIT) fonts.delete(fonts.keys().next().value)

  fonts.set(key, resolved)

  return resolved
}

const paragraphs = new Map()

// A cell builds a paragraph style out of the control's own alignment for a
// plain string and leaves an attributed one exactly as it was given, so where
// the lines sit is part of the text here rather than a property of the field.
function paragraph(alignment) {
  let resolved = paragraphs.get(alignment)

  if (resolved === undefined) {
    resolved = new AppKit.ParagraphStyle()
    resolved.alignment = alignment

    paragraphs.set(alignment, resolved)
  }

  return resolved
}

function foreground(color) {
  if (color === undefined) return Color.labelColor

  const { red, green, blue, alpha } = style.color(color)

  return Color.rgb(red, green, blue, alpha)
}

// Each line sits on an integer baseline, so the ascender and the descender
// round up separately rather than their sum. Rounding the sum comes out a
// point short at some sizes, which loses the last line.
function lineHeight(font) {
  return Math.ceil(font.ascender) + Math.ceil(-font.descender) + Math.ceil(font.leading)
}

// `NSTextField` draws its text inset inside the control, so a box measured
// from the glyphs alone is too small and the last word is dropped. The inset
// belongs to the cell rather than to the font, so it is measured once.
let inset = null

function cellInset(framesetter) {
  if (inset === null) {
    const probe = new AppKit.TextField({ x: 0, y: 0, width: 0, height: 0 })

    probe.editable = false
    probe.selectable = false
    probe.bordered = false
    probe.drawsBackground = false
    probe.font = Font.systemFont(DEFAULT_FONT_SIZE)
    probe.stringValue = 'M'

    const { width } = framesetter.measure('M', { family: null, size: DEFAULT_FONT_SIZE }, Infinity)

    inset = probe.fittingSize.width - width
  }

  return inset
}

module.exports = class NativeText extends NativeTextNode {
  constructor(text = '') {
    super(text)

    this._native = new AppKit.TextField({ x: 0, y: 0, width: 0, height: 0 })

    this._native.editable = false
    this._native.selectable = false
    this._native.bordered = false
    this._native.drawsBackground = false

    // Measuring with Core Text rather than by asking the control keeps the
    // result identical on both Apple platforms and off the main work.
    this._framesetter = new Framesetter()

    this._attributed = null
    this._alignment = ALIGNMENT.natural
    this._lineHeight = 0

    this._layout.measure = this._onmeasure.bind(this)

    this._apply()
  }

  _onmeasure(width, widthMode, height, heightMode) {
    const inset = cellInset(this._framesetter)

    // The text wraps inside the inset, not inside the box, so the constraint
    // handed to Core Text is the room the control will actually give it.
    const available =
      widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : Math.max(0, width - inset)

    const measured = this._framesetter.measureAttributed(this._attributed, available)

    return {
      width: measured.width + inset,
      height: measured.lines * this._lineHeight
    }
  }

  // The control draws the same attributed string the framesetter lays out, so
  // there is one place for the two to agree on a font rather than two.
  _apply() {
    const string = new AppKit.AttributedString()
    const paragraphStyle = paragraph(this._alignment)

    let height = 0

    for (const run of this._runs) {
      const face = font(run.style)

      string.appendString(run.text, {
        font: face,
        foregroundColor: foreground(run.style.color),
        paragraphStyle
      })

      height = Math.max(height, lineHeight(face))
    }

    this._attributed = string
    this._lineHeight = height === 0 ? lineHeight(font(this._own)) : height

    this._native.attributedStringValue = string

    this._layout.markDirty()
  }

  _paint(properties) {
    let changed = this._inherit(properties)

    if ('textAlign' in properties) {
      this._alignment = ALIGNMENT[properties.textAlign]
      changed = true
    }

    if (changed) this._apply()
  }

  _destroy() {
    this._native.removeFromSuperview()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeText }
    }
  }
}
