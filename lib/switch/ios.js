const UIKitSwitch = require('bare-ui-kit/switch')

const NativeSwitchNode = require('../switch-node')
const Paint = require('../paint/apple')

module.exports = class NativeSwitch extends NativeSwitchNode {
  constructor() {
    super()

    this._native = new UIKitSwitch({ x: 0, y: 0, width: 0, height: 0 })

    this._painter = new Paint(this._native)

    this._native.on('valueChanged', this._toggled.bind(this))
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

  // UIKit draws focus rings itself for keyboard and pointer focus.
  _ringed(ring) {}

  _enabling(enabled) {
    this._native.enabled = enabled
  }

  // The border is a separate layer, so the painter needs the box size.
  _resized(width, height) {
    this._painter.resize(width, height)
  }

  _untransform() {
    this._painter.untransform()
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
