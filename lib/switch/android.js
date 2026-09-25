const NDK = require('bare-ndk')

const NativeSwitchNode = require('../switch-node')
const Paint = require('../paint/android')
const { dp } = require('../metrics/android')

module.exports = class NativeSwitch extends NativeSwitchNode {
  constructor() {
    super()

    this._native = new NDK.Toggle()

    this._painter = new Paint(this._native)

    this._native.on('checked', this._toggled.bind(this))
  }

  _read() {
    return this._native.checked
  }

  _write(value) {
    this._native.checked = value
  }

  _natural() {
    const { width, height } = this._native.naturalSize

    return { width: dp(width), height: dp(height) }
  }

  _enabling(enabled) {
    this._native.enabled = enabled
  }

  _paint(properties) {
    this._painter.apply(properties)
  }

  _destroy() {}

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeSwitch }
    }
  }
}
