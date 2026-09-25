const AppKit = require('bare-app-kit')

const NativeSwitchNode = require('../switch-node')
const Paint = require('../paint/apple')

const { Control } = AppKit

module.exports = class NativeSwitch extends NativeSwitchNode {
  constructor() {
    super()

    this._native = new AppKit.Switch({ x: 0, y: 0, width: 0, height: 0 })

    this._native.wantsLayer = true

    this._painter = new Paint(this._native)

    // A control sends its action when someone works it and never when its
    // state is set, so the fence above costs nothing here and everything on
    // the three platforms that do not draw the line.
    this._native.on('change', this._toggled.bind(this))
  }

  get layer() {
    return this._painter.layer
  }

  _read() {
    return this._native.state === Control.STATE.ON
  }

  _write(value) {
    this._native.state = value ? Control.STATE.ON : Control.STATE.OFF
  }

  _natural() {
    const { width, height } = this._native.fittingSize

    return { width, height }
  }

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
