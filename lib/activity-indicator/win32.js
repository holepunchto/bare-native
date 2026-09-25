const WinUI = require('bare-win-ui')

const NativeActivityIndicatorNode = require('../activity-indicator-node')
const style = require('../style')

const { ProgressRing, SolidColorBrush } = WinUI

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

    this._native = new ProgressRing()

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

  _paint(properties) {
    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'color':
          this._native.foreground =
            value === undefined ? null : new SolidColorBrush({ color: bytes(value) })
          break
        case 'backgroundColor':
          this._native.background = new SolidColorBrush({ color: bytes(value) })
          break
        case 'borderColor':
          this._native.borderBrush = new SolidColorBrush({ color: bytes(value) })
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
  }

  _destroy() {}

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeActivityIndicator }
    }
  }
}
