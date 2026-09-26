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

    // A control sends its action when someone works it and never when its
    // state is set, so the fence above costs nothing here and everything on
    // the three platforms that do not draw the line.
    this._native.on('change', this._toggled.bind(this))
  }

  get layer() {
    return this._painter.layer
  }

  _read() {
    return this._native.state === AppKitControl.STATE.ON
  }

  _write(value) {
    this._native.state = value ? AppKitControl.STATE.ON : AppKitControl.STATE.OFF
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

  // A border is a layer of its own beneath the content, so what paints has to
  // be told the box it is drawing.
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
