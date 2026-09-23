const WinUI = require('bare-win-ui')
const { measure } = require('bare-win-ui/text')
const { constants } = require('bare-yoga')

const NativeNode = require('../node')
const style = require('../style')

const { TextBlock } = WinUI

const ALIGNMENT = {
  left: TextBlock.TEXT_ALIGNMENT.LEFT,
  center: TextBlock.TEXT_ALIGNMENT.CENTER,
  right: TextBlock.TEXT_ALIGNMENT.RIGHT,
  justify: TextBlock.TEXT_ALIGNMENT.JUSTIFY,
  natural: TextBlock.TEXT_ALIGNMENT.START
}

const DEFAULT_FONT_SIZE = 14

module.exports = class NativeText extends NativeNode {
  constructor(text = '') {
    super()

    this._native = new TextBlock()
    this._native.textWrapping = TextBlock.TEXT_WRAPPING.WRAP

    this._defaults = {
      fontFamily: this._native.fontFamily,
      foreground: this._native.foreground
    }

    this._text = text
    this._family = null
    this._size = DEFAULT_FONT_SIZE

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
    const available = widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : width

    const measured = measure(this._text, { family: this._family, size: this._size }, available)

    return { width: measured.width, height: measured.height }
  }

  _apply() {
    this._native.text = this._text
    this._native.fontSize = this._size
    this._native.fontFamily =
      this._family === null
        ? this._defaults.fontFamily
        : new WinUI.FontFamily({ familyName: this._family })

    this._layout.markDirty()
  }

  _paint(properties) {
    let font = false

    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'color': {
          if (value === undefined) {
            this._native.foreground = this._defaults.foreground
            break
          }

          const { red, green, blue, alpha } = style.color(value)

          this._native.foreground = new WinUI.SolidColorBrush({
            color: {
              a: Math.round(alpha * 255),
              r: Math.round(red * 255),
              g: Math.round(green * 255),
              b: Math.round(blue * 255)
            }
          })
          break
        }
        case 'fontFamily':
          this._family = value
          font = true
          break
        case 'fontSize':
          this._size = value === undefined ? DEFAULT_FONT_SIZE : value
          font = true
          break
        case 'textAlign':
          this._native.textAlignment = ALIGNMENT[value]
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
