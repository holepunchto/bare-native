const WinUICanvas = require('bare-win-ui/canvas')
const WinUISolidColorBrush = require('bare-win-ui/solid-color-brush')
const WinUIToggleSwitch = require('bare-win-ui/toggle-switch')

const NativeSwitchNode = require('../switch-node')
const Paint = require('../paint/win32')
const style = require('../style')

function bytes(value) {
  const { red, green, blue, alpha } = style.color(value)

  return {
    a: Math.round(alpha * 255),
    r: Math.round(red * 255),
    g: Math.round(green * 255),
    b: Math.round(blue * 255)
  }
}

module.exports = class NativeSwitch extends NativeSwitchNode {
  constructor() {
    super()

    this._native = new WinUIToggleSwitch()

    this._loaded = false
    this._wanted = false

    // The style reserves room for the "On" and "Off" labels through a static
    // resource that cannot be overridden, but the property it sets can.
    this._native.minWidth = 0

    // Drop the "On" and "Off" labels, which no other platform draws.
    this._native.content('', '')

    this._native.on('toggled', this._toggled.bind(this))

    // The template is only expanded once loaded, which changes the measured size.
    this._native.on('loaded', () => {
      this._loaded = true

      // A value written before loading is not shown, so it is written again,
      // fenced as a caller write.
      if (this._native.isOn !== this._wanted) {
        this._fenced(() => (this._native.isOn = this._wanted))
      }

      this._remeasure()
    })
  }

  _read() {
    return this._loaded ? this._native.isOn : this._wanted
  }

  _write(value) {
    this._wanted = value

    if (this._loaded) this._native.isOn = value
  }

  // The layout sets the control's size on every pass, so the size is released
  // while measuring. It is restored rather than left to `_place`, because a
  // measured node is not always placed.
  _natural() {
    const box = { width: this._native.width, height: this._native.height }

    this._native.width = NaN
    this._native.height = NaN

    const { width, height } = this._native.measure({
      width: Infinity,
      height: Infinity
    }).desiredSize

    this._native.width = box.width
    this._native.height = box.height

    return { width, height }
  }

  // Unlike a text box's underline, the focus rectangle is drawn by the system
  // rather than the template, so it can be turned off.
  _ringed(ring) {
    this._native.useSystemFocusVisuals = ring
  }

  _enabling(enabled) {
    this._native.isEnabled = enabled
  }

  // A control paints through its own properties rather than composition visuals,
  // so it has nowhere to put the visual a shadow needs.
  _paint(properties) {
    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'backgroundColor':
          this._native.background = new WinUISolidColorBrush({ color: bytes(value) })
          break
        case 'borderColor':
          this._native.borderBrush = new WinUISolidColorBrush({ color: bytes(value) })
          break
        case 'borderWidth':
          this._native.borderThickness = value
          break
        case 'borderRadius':
          this._native.cornerRadius = value
          break
        case 'opacity':
          this._native.opacity = value
          break
        case 'zIndex':
          WinUICanvas.setZIndex(this._native, value)
          break
      }
    }

    if ('transform' in properties) Paint.transform(this._native, properties)
  }

  _destroy() {}

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeSwitch }
    }
  }
}
