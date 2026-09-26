const WinUICanvas = require('bare-win-ui/canvas')
const WinUIProgressRing = require('bare-win-ui/progress-ring')
const WinUISolidColorBrush = require('bare-win-ui/solid-color-brush')

const NativeActivityIndicatorNode = require('../activity-indicator-node')
const Paint = require('../paint/win32')
const style = require('../style')

// WinUI draws a ring at whatever size it is given and names no sizes of its
// own, so the two React Native names are the two the Apple platforms draw.
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

  // A ring that is not active draws nothing, which is what the other four do
  // and what React Native means by not animating.
  _animate(animating) {
    this._native.isActive = animating
  }

  // A control paints through its own properties rather than through the
  // composition visuals a canvas needs, as a toggle switch does and for the
  // same reason, and casts no shadow for the same reason again.
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
          // Depth is the parent canvas's to sort by, which a control carries
          // as readily as a panel does.
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
