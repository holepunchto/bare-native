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

function signature(runs) {
  let key = ''

  for (const run of runs) {
    const { color, fontFamily, fontSize, fontWeight, fontStyle } = run.style

    key += `${run.text}\u0000${color}\u0000${fontFamily}\u0000${fontSize}\u0000${fontWeight}\u0000${fontStyle}\u0001`
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

    this._layout.measure = this._onmeasure.bind(this)

    this._apply()
  }

  _onmeasure(width, widthMode, height, heightMode) {
    const available = widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : px(width)

    const key = `${this._signature}\u0002${available}`

    let measured = measurements.get(key)

    if (measured === undefined) {
      measured = measureSpanned(this._spanned, available)

      if (measurements.size === CACHE_LIMIT) {
        measurements.delete(measurements.keys().next().value)
      }

      measurements.set(key, measured)
    }

    return { width: dp(measured.width), height: dp(measured.height) }
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
        })
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
    const changed = this._inherit(properties)

    if ('textAlign' in properties) {
      const alignment = properties.textAlign

      this._native.gravity = ALIGNMENT[alignment]
      this._native.justificationMode =
        alignment === 'justify' ? JUSTIFICATION_MODE.INTER_WORD : JUSTIFICATION_MODE.NONE
    }

    if (changed) this._apply()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeText }
    }
  }
}
