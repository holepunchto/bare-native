const NDK = require('bare-ndk')
const { measure } = require('bare-ndk/text')
const { constants } = require('bare-yoga')

const NativeNode = require('../node')
const style = require('../style')
const { px, dp } = require('../metrics/android')

const { GRAVITY, JUSTIFICATION_MODE } = NDK.TextView

const ALIGNMENT = {
  left: GRAVITY.LEFT,
  center: GRAVITY.CENTER_HORIZONTAL,
  right: GRAVITY.RIGHT,
  justify: GRAVITY.START,
  natural: GRAVITY.START
}

function argb({ red, green, blue, alpha }) {
  return (
    (Math.round(alpha * 255) << 24) |
    (Math.round(red * 255) << 16) |
    (Math.round(green * 255) << 8) |
    Math.round(blue * 255)
  )
}

module.exports = class NativeText extends NativeNode {
  constructor(text = '') {
    super()

    this._native = new NDK.TextView()

    this._text = text
    this._family = null

    // Zero is the control's own size, which the measurement reads the same way.
    this._size = 0

    this._defaults = {
      size: this._native.textSize,
      color: this._native.textColor,
      typeface: this._native.typeface
    }

    this._layout.measure = this._onmeasure.bind(this)

    this._apply()
  }

  get text() {
    return this._text
  }

  set text(value) {
    if (value === this._text) return

    this._text = value

    this._apply()
  }

  get _paintable() {
    return style.TEXT
  }

  get _container() {
    return false
  }

  _onmeasure(width, widthMode, height, heightMode) {
    const available = widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : px(width)

    const measured = measure(this._text, { family: this._family, size: px(this._size) }, available)

    return { width: dp(measured.width), height: dp(measured.height) }
  }

  // The control and the measurement agree on the font because both are a
  // `TextView` asked the same questions.
  _apply() {
    this._native.text = this._text
    this._native.textSize = this._size === 0 ? this._defaults.size : px(this._size)
    this._native.typeface =
      this._family === null ? this._defaults.typeface : NDK.Typeface.create(this._family)

    this._layout.markDirty()
  }

  _paint(properties) {
    let font = false

    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'color':
          this._native.textColor =
            value === undefined ? this._defaults.color : argb(style.color(value))
          break
        case 'fontFamily':
          this._family = value
          font = true
          break
        case 'fontSize':
          this._size = value === undefined ? 0 : value
          font = true
          break
        case 'textAlign':
          this._native.gravity = ALIGNMENT[value]
          this._native.justificationMode =
            value === 'justify' ? JUSTIFICATION_MODE.INTER_WORD : JUSTIFICATION_MODE.NONE
          break
      }
    }

    if (font) this._apply()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeText }
    }
  }
}
