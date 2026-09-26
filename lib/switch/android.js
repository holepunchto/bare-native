const NDKActivity = require('bare-ndk/activity')
const NDKToggle = require('bare-ndk/toggle')

const NativeSwitchNode = require('../switch-node')
const Paint = require('../paint/android')
const { dp } = require('../metrics/android')

module.exports = class NativeSwitch extends NativeSwitchNode {
  constructor() {
    super()

    this._native = new NDKToggle()

    this._painter = new Paint(this._native)

    this._native.on('checked', this._toggled.bind(this))
    this._native.on('focusChanged', (focused) => this._focused(focused))

    this._ring = true
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

  // A switch draws its focus through the background, which this layer has
  // painted over, so the stroke is swapped for the accent the theme chose
  // while the switch has the focus.
  _ringed(ring) {
    this._ring = ring

    if (ring === false) this._painter.focus(null)
  }

  _focused(focused) {
    if (focused && this._ring) {
      this._painter.focus({ width: 2, color: NDKActivity.themeColor('colorAccent') })
    } else {
      this._painter.focus(null)
    }
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
