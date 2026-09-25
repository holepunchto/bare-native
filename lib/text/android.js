const NDK = require('bare-ndk')
const { measureSpanned } = require('bare-ndk/text')
const { constants } = require('bare-yoga')

const NativeTextNode = require('../text-node')
const style = require('../style')
const { px, dp } = require('../metrics/android')

const { GRAVITY, JUSTIFICATION_MODE } = NDK.TextView
const { SPAN } = NDK.Spanned

const ALIGNMENT = {
  left: GRAVITY.LEFT,
  center: GRAVITY.CENTER_HORIZONTAL,
  right: GRAVITY.RIGHT,
  justify: GRAVITY.START,
  natural: GRAVITY.START
}

const CACHE_LIMIT = 4096

function argb({ red, green, blue, alpha }) {
  return (
    (Math.round(alpha * 255) << 24) |
    (Math.round(red * 255) << 16) |
    (Math.round(green * 255) << 8) |
    Math.round(blue * 255)
  )
}

// What a `TextView` resolves for itself when nothing is set on it. Every view
// resolves the same, so it is read once and every run is then stated in full,
// which leaves the base paint of the view that measures out of it.
let defaults = null

const typefaces = new Map()

// A family name resolves a face, and a weight and a slant pick among the ones
// it has, which is `Typeface.create`'s two forms one after the other.
function typeface({ fontFamily, fontWeight, fontStyle }) {
  const family = fontFamily === undefined ? null : fontFamily
  const weight = style.weight(fontWeight) || 400
  const italic = style.italic(fontStyle)

  const key = `${family}\u0000${weight}\u0000${italic}`

  let resolved = typefaces.get(key)

  if (resolved !== undefined) return resolved

  const base =
    family === null ? defaults.typeface : NDK.Typeface.create(family, NDK.Typeface.STYLE.NORMAL)

  resolved = NDK.Typeface.create(base, weight, italic)

  if (typefaces.size === CACHE_LIMIT) typefaces.delete(typefaces.keys().next().value)

  typefaces.set(key, resolved)

  return resolved
}

// Spans carry the style rather than the text, so what a measurement depends on
// has to be written out to be keyed on. A list of a hundred rows drawing the
// same label measures it once.
const measurements = new Map()

// Android spells the two lines as two spans, so a run asking for both gets
// both and one asking for neither gets nothing to carry.
function lines(value) {
  const decoration = style.decoration(value)

  const spans = []

  if (decoration.includes('underline')) spans.push(new NDK.UnderlineSpan())
  if (decoration.includes('line-through')) spans.push(new NDK.StrikethroughSpan())

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

    this._native = new NDK.TextView()

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

    // Android counts a line height as the distance between baselines, so the
    // first line keeps the font's own height and only the gaps grow. Every
    // other platform, and CSS, make every line box that height, so the block
    // is the lines times the height and the difference is leading: half of it
    // above the first line and half below the last, which is where CSS puts
    // it. It is negative when a caller asks for lines shorter than the font,
    // and CSS overlaps them rather than refusing, so the box is what was asked
    // for and the drawing overflows it.
    if (this._lineHeight === 0) {
      this._leading = 0

      return { width: dp(measured.width) + this._trailing, height: dp(measured.height) }
    }

    this._leading = this._lineHeight * measured.lines - measured.height

    this._pad()

    return {
      width: dp(measured.width) + this._trailing,
      height: dp(measured.height + this._leading)
    }
  }

  _pad() {
    const half = Math.max(Math.round(this._leading / 2), 0)

    this._native.setPadding(0, half, 0, Math.max(this._leading - half, 0))
  }

  // The control draws the same spans the measurement lays out, and every run
  // states its face, size and colour, so neither depends on what a view
  // resolves for itself.
  _apply() {
    const runs = this._runs
    const spanned = new NDK.SpannableStringBuilder()

    let start = 0

    for (const run of runs) {
      spanned.append(run.text)

      const end = spanned.length

      for (const span of [
        new NDK.TypefaceSpan({ typeface: typeface(run.style) }),
        new NDK.AbsoluteSizeSpan({
          size: run.style.fontSize === undefined ? defaults.size : px(run.style.fontSize)
        }),
        new NDK.ForegroundColorSpan({
          color: run.style.color === undefined ? defaults.color : argb(style.color(run.style.color))
        }),
        ...(run.style.letterSpacing === undefined
          ? []
          : [new NDK.LetterSpacingSpan({ spacing: px(run.style.letterSpacing) })]),
        ...lines(run.style.textDecorationLine)
      ]) {
        spanned.setSpan(span, start, end, SPAN.INCLUSIVE_EXCLUSIVE)
      }

      start = end
    }

    this._spanned = spanned
    this._signature = signature(runs)

    this._native.text = spanned

    this._layout.markDirty()
  }

  _paint(properties) {
    let changed = this._inherit(properties)

    if ('textAlign' in properties) {
      const alignment = properties.textAlign

      this._native.gravity = ALIGNMENT[alignment]
      this._native.justificationMode =
        alignment === 'justify' ? JUSTIFICATION_MODE.INTER_WORD : JUSTIFICATION_MODE.NONE
    }

    // Android takes a height in pixels and has no word for the font's own, so
    // putting the property back is said through the spacing it is built on.
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
