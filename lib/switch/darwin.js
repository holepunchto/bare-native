const AppKitControl = require('bare-app-kit/control')
const AppKitSwitch = require('bare-app-kit/switch')
const AppKitView = require('bare-app-kit/view')

const NativeSwitchNode = require('../switch-node')
const Paint = require('../paint/apple')

module.exports = class NativeSwitch extends NativeSwitchNode {
  constructor() {
    super()

    this._native = new AppKitSwitch({ x: 0, y: 0, width: 0, height: 0 })

    this._native.wantsLayer = true

    this._painter = new Paint(this._native)

    // AppKit sends the action only for user input, never for programmatic writes.
    this._native.on('change', this._toggled.bind(this))
  }

  _read() {
    return this._native.state === AppKitControl.STATE_VALUE.ON
  }

  _write(value) {
    this._native.state = value ? AppKitControl.STATE_VALUE.ON : AppKitControl.STATE_VALUE.OFF
  }

  _natural() {
    const { width, height } = this._native.fittingSize

    return { width, height }
  }

  _ringed(ring) {
    this._native.focusRingType = ring
      ? AppKitView.FOCUS_RING_TYPE.EXTERIOR
      : AppKitView.FOCUS_RING_TYPE.NONE
  }

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
