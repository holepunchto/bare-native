const NDKAbsoluteSizeSpan = require('bare-ndk/absolute-size-span')
const NDKForegroundColorSpan = require('bare-ndk/foreground-color-span')
const NDKLetterSpacingSpan = require('bare-ndk/letter-spacing-span')
const NDKSpannableStringBuilder = require('bare-ndk/spannable-string-builder')
const NDKSpanned = require('bare-ndk/spanned')
const NDKStrikethroughSpan = require('bare-ndk/strikethrough-span')
const NDKTextView = require('bare-ndk/text-view')
const NDKTypeface = require('bare-ndk/typeface')
const NDKTypefaceSpan = require('bare-ndk/typeface-span')
const NDKUnderlineSpan = require('bare-ndk/underline-span')
const { measureSpanned } = require('bare-ndk/text')
const { constants } = require('bare-yoga')

const NativeTextNode = require('../text-node')
const Paint = require('../paint/android')
const style = require('../style')
const { px, dp } = require('../metrics/android')

const { GRAVITY, JUSTIFICATION_MODE } = NDKTextView
const { SPAN } = NDKSpanned

const ALIGNMENT = {
  left: GRAVITY.LEFT,
  center: GRAVITY.CENTER_HORIZONTAL,
  right: GRAVITY.RIGHT,
  justify: GRAVITY.START,
  natural: GRAVITY.START
}

// What a `TextView` takes as no line limit.
const MAX_LINES = 0x7fffffff

const CACHE_LIMIT = 4096

function argb({ red, green, blue, alpha }) {
  return (
    (Math.round(alpha * 255) << 24) |
    (Math.round(red * 255) << 16) |
    (Math.round(green * 255) << 8) |
    Math.round(blue * 255)
  )
}

// Every `TextView` resolves the same defaults, so they are read once and every
// run then states its style in full.
let defaults = null

const typefaces = new Map()

function typeface({ fontFamily, fontWeight, fontStyle }) {
  const family = fontFamily === undefined ? null : fontFamily
  const weight = style.weight(fontWeight) || 400
  const italic = style.italic(fontStyle)

  const key = `${family}\u0000${weight}\u0000${italic}`

  let resolved = typefaces.get(key)

  if (resolved !== undefined) return resolved

  const base =
    family === null ? defaults.typeface : NDKTypeface.create(family, NDKTypeface.STYLE.NORMAL)

  resolved = NDKTypeface.create(base, weight, italic)

  if (typefaces.size === CACHE_LIMIT) typefaces.delete(typefaces.keys().next().value)

  typefaces.set(key, resolved)

  return resolved
}

// Spans carry the style rather than the text, so the cache key spells out
// everything a measurement depends on.
const measurements = new Map()

function lines(value) {
  const decoration = style.decoration(value)

  const spans = []

  if (decoration.includes('underline')) spans.push(new NDKUnderlineSpan())
  if (decoration.includes('line-through')) spans.push(new NDKStrikethroughSpan())

  return spans
}

function signature(runs) {
  let key = ''

  for (const run of runs) {
    const { color, fontFamily, fontSize, fontWeight, fontStyle, letterSpacing } = run.style

    key += `${run.text}\u0000${color}\u0000${fontFamily}\u0000${fontSize}\u0000${fontWeight}\u0000${fontStyle}\u0000${letterSpacing}\u0000${run.style.textDecorationLine}\u0001`
  }

  return key
}

module.exports = class NativeText extends NativeTextNode {
  constructor(text = '') {
    super(text)

    this._native = new NDKTextView()

    this._painter = new Paint(this._native)

    if (defaults === null) {
      defaults = {
        size: this._native.textSize,
        color: this._native.textColor,
        typeface: this._native.typeface
      }
    }

    this._spanned = null
    this._signature = ''
    this._lineHeight = 0
    this._leading = 0

    this._layout.measure = this._onmeasure.bind(this)

    this._apply()
  }

  _onmeasure(width, widthMode, height, heightMode) {
    const available = widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : px(width)

    const key = `${this._signature}\u0002${available}\u0002${this._lineHeight}`

    let measured = measurements.get(key)

    if (measured === undefined) {
      measured = measureSpanned(this._spanned, available, this._lineHeight)

      if (measurements.size === CACHE_LIMIT) {
        measurements.delete(measurements.keys().next().value)
      }

      measurements.set(key, measured)
    }

    // Android applies line height between baselines, so only the gaps grow. CSS
    // makes every line box that height, so the difference is leading, split above
    // the first line and below the last. It is negative for lines shorter than the
    // font, in which case the drawing overflows the box, as in CSS.
    if (this._lineHeight === 0) {
      this._leading = 0

      return {
        width: dp(measured.width) + this._trailing,
        height: this._capped(measured.lines, dp(measured.height))
      }
    }

    this._leading = this._lineHeight * measured.lines - measured.height

    this._pad()

    return {
      width: dp(measured.width) + this._trailing,
      height: this._capped(measured.lines, dp(measured.height + this._leading))
    }
  }

  _pad() {
    const half = Math.max(Math.round(this._leading / 2), 0)

    this._native.setPadding(0, half, 0, Math.max(this._leading - half, 0))
  }

  _apply() {
    const runs = this._runs
    const spanned = new NDKSpannableStringBuilder()

    let start = 0

    for (const run of runs) {
      spanned.append(run.text)

      const end = spanned.length

      for (const span of [
        new NDKTypefaceSpan({ typeface: typeface(run.style) }),
        new NDKAbsoluteSizeSpan({
          size: run.style.fontSize === undefined ? defaults.size : px(run.style.fontSize)
        }),
        new NDKForegroundColorSpan({
          color: run.style.color === undefined ? defaults.color : argb(style.color(run.style.color))
        }),
        ...(run.style.letterSpacing === undefined
          ? []
          : [new NDKLetterSpacingSpan({ spacing: px(run.style.letterSpacing) })]),
        ...lines(run.style.textDecorationLine)
      ]) {
        spanned.setSpan(span, start, end, SPAN.INCLUSIVE_EXCLUSIVE)
      }

      start = end
    }

    this._spanned = spanned
    this._signature = signature(runs)

    this._native.text = spanned

    this._remeasure()
  }

  _resized(width, height) {
    const { top, right, bottom, left } = this._padding

    this._native.setPadding(px(left), px(top), px(right), px(bottom))
  }

  _truncated(lines, mode) {
    this._native.maxLines = lines === 0 ? MAX_LINES : lines
    this._native.ellipsize = lines === 0 || mode === 'clip' ? null : 'END'

    this._remeasure()
  }

  _paint(properties) {
    this._painter.apply(properties)

    let changed = this._inherit(properties)

    if ('textAlign' in properties) {
      const alignment = properties.textAlign

      this._native.gravity = ALIGNMENT[alignment]
      this._native.justificationMode =
        alignment === 'justify' ? JUSTIFICATION_MODE.INTER_WORD : JUSTIFICATION_MODE.NONE
    }

    // Android has no value for the font's own line height, so it is restored
    // through the line spacing.
    if ('lineHeight' in properties) {
      const { lineHeight } = properties

      this._lineHeight = lineHeight === undefined ? 0 : px(lineHeight)

      if (this._lineHeight === 0) {
        this._native.setLineSpacing(0, 1)

        this._leading = 0

        this._pad()
      } else {
        this._native.lineHeight = this._lineHeight
      }

      changed = true
    }

    if (changed) this._apply()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeText }
    }
  }
}
