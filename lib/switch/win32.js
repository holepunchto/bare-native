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

    // A toggle switch reserves room to write "On" and "Off" beside itself
    // whether or not it has anything to write there. The style takes that
    // minimum through a static resource, which is resolved once where the
    // style was loaded and so cannot be overridden from here; the property it
    // sets can be.
    this._native.minWidth = 0

    // A toggle switch writes "On" and "Off" beside itself and reserves the
    // room whether or not it has anything to write, which is a label none of
    // the other four draw and this vocabulary cannot ask for.
    this._native.content('', '')

    this._native.on('toggled', this._toggled.bind(this))

    // A control measures what its template puts inside it, and only expands
    // one once it is realised, which is what it reports here.
    this._native.on('loaded', () => {
      this._loaded = true

      // A control that is told before it is realised has nowhere to show it,
      // so what was asked for is asked for again now that it has, and fenced,
      // because it is still the caller's write rather than anyone's toggle.
      if (this._native.isOn !== this._wanted) {
        this._fenced(() => (this._native.isOn = this._wanted))
      }

      this._remeasure()
      this._relayout()
    })
  }

  _read() {
    return this._loaded ? this._native.isOn : this._wanted
  }

  _write(value) {
    this._wanted = value

    if (this._loaded) this._native.isOn = value
  }

  // A control measures what its template puts inside it, and the layout gives
  // it a size on every pass, so it is asked with that let go of.
  _natural() {
    this._native.width = NaN
    this._native.height = NaN

    const { width, height } = this._native.measure({
      width: Infinity,
      height: Infinity
    }).desiredSize

    return { width, height }
  }

  // The rectangle WinUI draws over a focused control is the system's rather
  // than the template's, so unlike a text box's underline it is the caller's
  // to turn off.
  _ringed(ring) {
    this._native.useSystemFocusVisuals = ring
  }

  _enabling(enabled) {
    this._native.isEnabled = enabled
  }

  // A control paints through its own properties rather than through the
  // composition visuals a canvas needs, as a text box does and for the same
  // reason. A shadow is what that costs: one is cast by a visual kept behind
  // the content, and a templated control has nowhere to put one.
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
