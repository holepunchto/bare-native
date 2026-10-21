const WinUICanvas = require('bare-win-ui/canvas')
const WinUIProgressRing = require('bare-win-ui/progress-ring')
const WinUISolidColorBrush = require('bare-win-ui/solid-color-brush')

const NativeActivityIndicatorNode = require('../activity-indicator-node')
const Paint = require('../paint/win32')
const style = require('../style')

// WinUI names no ring sizes, so these match the Apple platforms.
const SIZES = { small: 16, large: 32 }

function bytes(value) {
  const { red, green, blue, alpha } = style.color(value)

  return {
    a: Math.round(alpha * 255),
    r: Math.round(red * 255),
    g: Math.round(green * 255),
    b: Math.round(blue * 255)
  }
}

module.exports = class NativeActivityIndicator extends NativeActivityIndicatorNode {
  constructor() {
    super()

    this._native = new WinUIProgressRing()

    this._native.isActive = true
  }

  _natural() {
    const size = SIZES[this._size]

    return { width: size, height: size }
  }

  _animate(animating) {
    this._native.isActive = animating
  }

  // A control paints through its own properties rather than composition visuals,
  // so it has nowhere to put the visual a shadow needs.
  _paint(properties) {
    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'color':
          this._native.foreground =
            value === undefined ? null : new WinUISolidColorBrush({ color: bytes(value) })
          break
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
      __proto__: { constructor: NativeActivityIndicator }
    }
  }
}
