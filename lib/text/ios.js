const UIKitView = require('bare-ui-kit/view')
const UIKitAttributedString = require('bare-ui-kit/attributed-string')
const UIKitColor = require('bare-ui-kit/color')
const UIKitFont = require('bare-ui-kit/font')
const UIKitFontDescriptor = require('bare-ui-kit/font-descriptor')
const UIKitLabel = require('bare-ui-kit/label')
const UIKitParagraphStyle = require('bare-ui-kit/paragraph-style')
const CoreTextFramesetter = require('bare-core-text/framesetter')
const { constants } = require('bare-yoga')

const NativeTextNode = require('../text-node')
const Paint = require('../paint/apple')
const style = require('../style')

const ALIGNMENT = {
  left: UIKitLabel.TEXT_ALIGNMENT.LEFT,
  center: UIKitLabel.TEXT_ALIGNMENT.CENTER,
  right: UIKitLabel.TEXT_ALIGNMENT.RIGHT,
  justify: UIKitLabel.TEXT_ALIGNMENT.JUSTIFIED,
  natural: UIKitLabel.TEXT_ALIGNMENT.NATURAL
}

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

// A family only has the faces it was drawn with, and a descriptor can only ask
// for bold, which CSS calls 600 and up. Only the system font has every weight.
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

  if (italic) traits |= UIKitFontDescriptor.SYMBOLIC_TRAITS.ITALIC
  if (family !== null && weight >= 600) traits |= UIKitFontDescriptor.SYMBOLIC_TRAITS.BOLD

  if (traits !== 0) {
    resolved = UIKitFont.withDescriptor(resolved.fontDescriptor.withSymbolicTraits(traits), size)
  }

  if (fonts.size === CACHE_LIMIT) fonts.delete(fonts.keys().next().value)

  fonts.set(key, resolved)

  return resolved
}

const paragraphs = new Map()

// A label ignores its own alignment for an attributed string, so alignment
// goes in the paragraph style. A requested line height is set as both the
// minimum and the maximum.
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

const BREAK = {
  tail: UIKitLabel.LINE_BREAK_MODE.TRUNCATING_TAIL,
  clip: UIKitLabel.LINE_BREAK_MODE.CLIPPING
}

function foreground(color) {
  if (color === undefined) return UIKitColor.labelColor

  const { red, green, blue, alpha } = style.color(color)

  return UIKitColor.rgb(red, green, blue, alpha)
}

module.exports = class NativeText extends NativeTextNode {
  constructor(text = '') {
    super(text)

    this._text = new UIKitLabel()

    // Neither `NSTextField` nor `UILabel` supports padding, so the text sits
    // inside a view that paints, offset by the padding.
    this._native = new UIKitView({ x: 0, y: 0, width: 0, height: 0 })

    this._native.insertSubviewAtIndex(this._text, 0)

    this._painter = new Paint(this._native)

    // Wrap to the box Yoga decides rather than the default single line.
    this._text.numberOfLines = 0
    this._text.lineBreakMode = UIKitLabel.LINE_BREAK_MODE.WORD_WRAPPING

    // Measuring with Core Text rather than the control keeps the result
    // identical on both Apple platforms and off the main thread.
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

    const measured = this._framesetter.measureAttributed(this._measuring, available)

    // A label puts each line on an integer baseline, so the height uses the
    // control's line height rather than Core Text's.
    return {
      width: measured.width,
      height: this._capped(measured.lines, measured.lines * this._lineHeight)
    }
  }

  _apply() {
    this._attributed = this._build()

    this._measuring = this._attributed

    this._text.attributedText = this._attributed

    // The string's paragraph style resets the label's line break mode, so the
    // limit is applied again. The React renderer writes in exactly that order.
    this._truncated(this._numberOfLines, this._ellipsizeMode)

    this._remeasure()
  }

  _build() {
    const string = new UIKitAttributedString()
    const paragraphStyle = paragraph(this._alignment, this._lineSpacing)

    let height = 0

    for (const run of this._runs) {
      const face = font(run.style)

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

    this._lineHeight =
      this._lineSpacing === undefined
        ? height === 0
          ? Math.ceil(font(this._own).lineHeight)
          : height
        : this._lineSpacing

    return string
  }

  _resized(width, height) {
    const { top, right, bottom, left } = this._padding

    this._text.frame = {
      x: left,
      y: top,
      width: Math.max(0, width - left - right),
      height: Math.max(0, height - top - bottom)
    }

    this._painter.resize(width, height)
  }

  _untransform() {
    this._painter.untransform()
  }

  _truncated(lines, mode) {
    this._text.numberOfLines = lines

    // A truncating paragraph style stops the text wrapping, so the label
    // truncates instead.
    this._text.lineBreakMode = lines === 0 ? UIKitLabel.LINE_BREAK_MODE.WORD_WRAPPING : BREAK[mode]
  }

  _paint(properties) {
    this._painter.apply(properties)

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
