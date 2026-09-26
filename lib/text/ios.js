const UIKitAttributedString = require('bare-ui-kit/attributed-string')
const UIKitColor = require('bare-ui-kit/color')
const UIKitFont = require('bare-ui-kit/font')
const UIKitFontDescriptor = require('bare-ui-kit/font-descriptor')
const UIKitLabel = require('bare-ui-kit/label')
const UIKitParagraphStyle = require('bare-ui-kit/paragraph-style')
const CoreTextFramesetter = require('bare-core-text/framesetter')
const { constants } = require('bare-yoga')

const NativeTextNode = require('../text-node')
const style = require('../style')

const ALIGNMENT = {
  left: UIKitLabel.ALIGNMENT.LEFT,
  center: UIKitLabel.ALIGNMENT.CENTER,
  right: UIKitLabel.ALIGNMENT.RIGHT,
  justify: UIKitLabel.ALIGNMENT.JUSTIFIED,
  natural: UIKitLabel.ALIGNMENT.NATURAL
}

// Apple names nine weights and CSS numbers nine, so the two line up.
const WEIGHTS = [
  UIKitFont.WEIGHT.ULTRA_LIGHT,
  UIKitFont.WEIGHT.THIN,
  UIKitFont.WEIGHT.LIGHT,
  UIKitFont.WEIGHT.REGULAR,
  UIKitFont.WEIGHT.MEDIUM,
  UIKitFont.WEIGHT.SEMIBOLD,
  UIKitFont.WEIGHT.BOLD,
  UIKitFont.WEIGHT.HEAVY,
  UIKitFont.WEIGHT.BLACK
]

const DEFAULT_FONT_SIZE = 17

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
      ? UIKitFont.systemFont(size, WEIGHTS[Math.min(Math.max(Math.round(weight / 100), 1), 9) - 1])
      : UIKitFont.withName(family, size) || UIKitFont.systemFont(size)

  let traits = 0

  if (italic) traits |= UIKitFontDescriptor.TRAIT.ITALIC
  if (family !== null && weight >= 600) traits |= UIKitFontDescriptor.TRAIT.BOLD

  if (traits !== 0) {
    resolved = UIKitFont.withDescriptor(resolved.fontDescriptor.withSymbolicTraits(traits), size)
  }

  if (fonts.size === CACHE_LIMIT) fonts.delete(fonts.keys().next().value)

  fonts.set(key, resolved)

  return resolved
}

const paragraphs = new Map()

// A label applies its own alignment to a plain string and leaves an attributed
// one exactly as it was given, so where the lines sit is part of the text here
// rather than a property of the label. A line of a height a caller asked for
// is fixed at it from both ends, which is what makes it that height rather
// than at least it.
function paragraph(alignment, height) {
  const key = `${alignment}:${height}`

  let resolved = paragraphs.get(key)

  if (resolved === undefined) {
    resolved = new UIKitParagraphStyle()
    resolved.alignment = alignment

    if (height !== undefined) {
      resolved.minimumLineHeight = height
      resolved.maximumLineHeight = height
    }

    paragraphs.set(key, resolved)
  }

  return resolved
}

function foreground(color) {
  if (color === undefined) return UIKitColor.labelColor

  const { red, green, blue, alpha } = style.color(color)

  return UIKitColor.rgb(red, green, blue, alpha)
}

module.exports = class NativeText extends NativeTextNode {
  constructor(text = '') {
    super(text)

    this._native = new UIKitLabel()

    // Yoga decides the box, so the label wraps to it rather than truncating
    // to a single line.
    this._native.numberOfLines = 0
    this._native.lineBreakMode = UIKitLabel.LINE_BREAK_MODE.WORD_WRAPPING

    // Measuring with Core Text rather than by asking the control keeps the
    // result identical on both Apple platforms and off the main work.
    this._framesetter = new CoreTextFramesetter()

    this._attributed = null
    this._alignment = ALIGNMENT.natural
    this._lineHeight = 0
    this._lineSpacing = undefined

    this._layout.measure = this._onmeasure.bind(this)

    this._apply()
  }

  _onmeasure(width, widthMode, height, heightMode) {
    const available = widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : width

    const measured = this._framesetter.measureAttributed(this._attributed, available)

    // A label lays each line out on an integer baseline, so how tall the text
    // ends up is the control's line height rather than Core Text's.
    return { width: measured.width, height: measured.lines * this._lineHeight }
  }

  // The label draws the same attributed string the framesetter lays out, so
  // there is one place for the two to agree on a font rather than two.
  _apply() {
    const string = new UIKitAttributedString()
    const paragraphStyle = paragraph(this._alignment, this._lineSpacing)

    let height = 0

    for (const run of this._runs) {
      const face = font(run.style)

      // Apple spells the space between characters as a kerning adjustment, in
      // the same points as everything else here, and a line under or through
      // a run as a style on each of the two separately.
      const { letterSpacing } = run.style

      const lines = style.decoration(run.style.textDecorationLine)

      string.appendString(run.text, {
        font: face,
        foregroundColor: foreground(run.style.color),
        paragraphStyle,
        ...(letterSpacing === undefined ? {} : { kern: letterSpacing }),
        ...(lines.includes('underline') ? { underlineStyle: 1 } : {}),
        ...(lines.includes('line-through') ? { strikethroughStyle: 1 } : {})
      })

      height = Math.max(height, Math.ceil(face.lineHeight))
    }

    this._attributed = string
    this._lineHeight =
      this._lineSpacing === undefined
        ? height === 0
          ? Math.ceil(font(this._own).lineHeight)
          : height
        : this._lineSpacing

    this._native.attributedText = string

    this._layout.markDirty()
  }

  _paint(properties) {
    let changed = this._inherit(properties)

    if ('textAlign' in properties) {
      this._alignment = ALIGNMENT[properties.textAlign]
      changed = true
    }

    if ('lineHeight' in properties) {
      this._lineSpacing = properties.lineHeight
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
