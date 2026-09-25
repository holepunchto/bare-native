const UIKit = require('bare-ui-kit')

const NativeSwitchNode = require('../switch-node')
const Paint = require('../paint/apple')

module.exports = class NativeSwitch extends NativeSwitchNode {
  constructor() {
    super()

    this._native = new UIKit.Switch({ x: 0, y: 0, width: 0, height: 0 })

    this._painter = new Paint(this._native)

    this._native.on('valueChanged', this._toggled.bind(this))
  }

  get layer() {
    return this._painter.layer
  }

  _read() {
    return this._native.isOn
  }

  _write(value) {
    this._native.isOn = value
  }

  _natural() {
    return this._native.sizeThatFits(Infinity, Infinity)
  }

  // UIKit draws a ring only for the focus system a keyboard or a pointer
  // drives, which it does without being asked, and a finger needs none.
  _ringed(ring) {}

  _enabling(enabled) {
    this._native.enabled = enabled
  }

  _paint(properties) {
    this._painter.apply(properties)
  }

  _destroy() {
    this._native.removeFromSuperview()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeSwitch }
    }
  }
}
