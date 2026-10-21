const GTKSwitch = require('bare-gtk/switch')
const { ORIENTATION_HORIZONTAL, ORIENTATION_VERTICAL } = require('bare-gtk/constants')

const NativeSwitchNode = require('../switch-node')
const Paint = require('../paint/linux')

module.exports = class NativeSwitch extends NativeSwitchNode {
  constructor() {
    super()

    this._native = new GTKSwitch()

    this._painter = new Paint(this._native)

    this._native.on('active', this._toggled.bind(this))

    this._ringed(true)
  }

  _read() {
    return this._native.active
  }

  _write(value) {
    this._native.active = value
  }

  // A switch draws at one size, so its natural size is the whole answer.
  _natural() {
    const [, width] = this._native.measure(ORIENTATION_HORIZONTAL)
    const [, height] = this._native.measure(ORIENTATION_VERTICAL)

    return { width, height }
  }

  // Themes show switch focus through properties this style replaces, so the
  // ring is drawn as an outline, which GTK keeps outside the layout box.
  _ringed(ring) {
    this._painter.focus({
      outline: ring ? '2px solid @theme_selected_bg_color' : null,
      'outline-offset': ring ? '-2px' : null
    })
  }

  _enabling(enabled) {
    this._native.sensitive = enabled
  }

  _paint(properties) {
    this._painter.apply(properties)
  }

  _destroy() {
    this._painter.destroy()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeSwitch }
    }
  }
}
