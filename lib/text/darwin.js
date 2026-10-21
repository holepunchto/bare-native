const AppKitView = require('bare-app-kit/view')
const AppKitAttributedString = require('bare-app-kit/attributed-string')
const AppKitColor = require('bare-app-kit/color')
const AppKitFont = require('bare-app-kit/font')
const AppKitFontDescriptor = require('bare-app-kit/font-descriptor')
const AppKitParagraphStyle = require('bare-app-kit/paragraph-style')
const AppKitText = require('bare-app-kit/text')
const AppKitTextField = require('bare-app-kit/text-field')
const CoreTextFramesetter = require('bare-core-text/framesetter')
const { constants } = require('bare-yoga')

const NativeTextNode = require('../text-node')
const Paint = require('../paint/apple')
const style = require('../style')

const ALIGNMENT = {
  left: AppKitText.TEXT_ALIGNMENT.LEFT,
  center: AppKitText.TEXT_ALIGNMENT.CENTER,
  right: AppKitText.TEXT_ALIGNMENT.RIGHT,
  justify: AppKitText.TEXT_ALIGNMENT.JUSTIFIED,
  natural: AppKitText.TEXT_ALIGNMENT.NATURAL
}

const WEIGHTS = [
  AppKitFont.WEIGHT.ULTRA_LIGHT,
  AppKitFont.WEIGHT.THIN,
  AppKitFont.WEIGHT.LIGHT,
  AppKitFont.WEIGHT.REGULAR,
  AppKitFont.WEIGHT.MEDIUM,
  AppKitFont.WEIGHT.SEMIBOLD,
  AppKitFont.WEIGHT.BOLD,
  AppKitFont.WEIGHT.HEAVY,
  AppKitFont.WEIGHT.BLACK
]

const DEFAULT_FONT_SIZE = 13

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
      ? AppKitFont.systemFont(size, WEIGHTS[Math.min(Math.max(Math.round(weight / 100), 1), 9) - 1])
      : AppKitFont.withName(family, size) || AppKitFont.systemFont(size)

  let traits = 0

  if (italic) traits |= AppKitFontDescriptor.SYMBOLIC_TRAITS.ITALIC
  if (family !== null && weight >= 600) traits |= AppKitFontDescriptor.SYMBOLIC_TRAITS.BOLD

  if (traits !== 0) {
    resolved = AppKitFont.withDescriptor(resolved.fontDescriptor.withSymbolicTraits(traits), size)
  }

  if (fonts.size === CACHE_LIMIT) fonts.delete(fonts.keys().next().value)

  fonts.set(key, resolved)

  return resolved
}

const paragraphs = new Map()

// A cell ignores its own alignment for an attributed string, so alignment
// goes in the paragraph style. A requested line height is set as both the
// minimum and the maximum.
function paragraph(alignment, height) {
  const key = `${alignment}:${height}`

  let resolved = paragraphs.get(key)

  if (resolved === undefined) {
    resolved = new AppKitParagraphStyle()
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
  if (color === undefined) return AppKitColor.labelColor

  const { red, green, blue, alpha } = style.color(color)

  return AppKitColor.rgb(red, green, blue, alpha)
}

// Each line sits on an integer baseline, so the parts round up separately.
// Rounding the sum can come out a point short and lose the last line.
function lineHeight(font) {
  return Math.ceil(font.ascender) + Math.ceil(-font.descender) + Math.ceil(font.leading)
}

// `NSTextField` insets its text, so a box measured from the glyphs alone
// drops the last word. The inset belongs to the cell, so it is measured once.
let inset = null

function cellInset(framesetter) {
  if (inset === null) {
    const probe = new AppKitTextField({ x: 0, y: 0, width: 0, height: 0 })

    probe.editable = false
    probe.selectable = false
    probe.bordered = false
    probe.drawsBackground = false
    probe.font = AppKitFont.systemFont(DEFAULT_FONT_SIZE)
    probe.stringValue = 'M'

    const { width } = framesetter.measure('M', { family: null, size: DEFAULT_FONT_SIZE }, Infinity)

    inset = probe.fittingSize.width - width
  }

  return inset
}

module.exports = class NativeText extends NativeTextNode {
  constructor(text = '') {
    super(text)

    this._text = new AppKitTextField({ x: 0, y: 0, width: 0, height: 0 })

    // Neither `NSTextField` nor `UILabel` supports padding, so the text sits
    // inside a view that paints, offset by the padding.
    this._native = new AppKitView({ x: 0, y: 0, width: 0, height: 0 })

    this._native.flipped = true
    this._native.wantsLayer = true

    this._native.addSubview(this._text)

    // The field may track a press itself rather than pass it on, so presses go
    // to the view around the text instead.
    this._native.hitTestable = false

    this._painter = new Paint(this._native)

    this._text.editable = false
    this._text.selectable = false
    this._text.bordered = false
    this._text.drawsBackground = false

    // Measuring with Core Text rather than the control keeps the result
    // identical on both Apple platforms and off the main thread.
    this._framesetter = new CoreTextFramesetter()

    this._attributed = null
    this._alignment = ALIGNMENT.natural
    this._lineSpacing = undefined
    this._lineHeight = 0

    this._layout.measure = this._onmeasure.bind(this)

    this._apply()
  }

  _onmeasure(width, widthMode, height, heightMode) {
    const inset = cellInset(this._framesetter)

    // The text wraps inside the cell inset, not the box.
    const available =
      widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : Math.max(0, width - inset)

    const measured = this._framesetter.measureAttributed(this._measuring, available)

    return {
      width: measured.width + inset,
      height: this._capped(measured.lines, measured.lines * this._lineHeight)
    }
  }

  _apply() {
    this._attributed = this._build()

    this._measuring = this._attributed

    this._text.attributedStringValue = this._attributed

    this._remeasure()
  }

  _build() {
    const string = new AppKitAttributedString()
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

      height = Math.max(height, lineHeight(face))
    }

    this._lineHeight =
      this._lineSpacing === undefined
        ? height === 0
          ? lineHeight(font(this._own))
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
    this._text.maximumNumberOfLines = lines

    // A truncating paragraph style stops the text wrapping, and it overrides the
    // cell's break mode, so the string wraps and the field truncates instead.
    this._text.truncatesLastVisibleLine = lines !== 0 && mode === 'tail'
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
