const GTK = require('bare-gtk')

const NativeSwitchNode = require('../switch-node')
const Paint = require('../paint/linux')

const { ORIENTATION_HORIZONTAL, ORIENTATION_VERTICAL } = GTK.constants

module.exports = class NativeSwitch extends NativeSwitchNode {
  constructor() {
    super()

    this._native = new GTK.Switch()

    this._painter = new Paint(this._native)

    this._native.on('active', this._toggled.bind(this))
  }

  _read() {
    return this._native.active
  }

  _write(value) {
    this._native.active = value
  }

  // A widget answers with the smallest it can be, the size it would rather
  // have, and two baselines; a switch draws at one size, so the second of
  // those is the whole answer.
  _natural() {
    const [, width] = this._native.measure(ORIENTATION_HORIZONTAL)
    const [, height] = this._native.measure(ORIENTATION_VERTICAL)

    return { width, height }
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
