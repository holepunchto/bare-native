const UIKit = require('bare-ui-kit')

const NativeActivityIndicatorNode = require('../activity-indicator-node')
const Paint = require('../paint/apple')
const style = require('../style')

const { ActivityIndicatorView, Color } = UIKit

const SIZES = {
  small: ActivityIndicatorView.STYLE.MEDIUM,
  large: ActivityIndicatorView.STYLE.LARGE
}

module.exports = class NativeActivityIndicator extends NativeActivityIndicatorNode {
  constructor() {
    super()

    this._native = new ActivityIndicatorView({ x: 0, y: 0, width: 0, height: 0 })

    this._native.style = SIZES.small

    this._painter = new Paint(this._native)

    this._native.animating = true
  }

  get layer() {
    return this._painter.layer
  }

  _natural() {
    return this._native.sizeThatFits(Infinity, Infinity)
  }

  _animate(animating) {
    this._native.animating = animating
  }

  _sized(size) {
    this._native.style = SIZES[size]
  }

  _paint(properties) {
    this._painter.apply(properties)

    if ('color' in properties) {
      const value = properties.color

      this._native.color = value === undefined ? null : rgb(value)
    }
  }

  _destroy() {
    this._native.removeFromSuperview()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeActivityIndicator }
    }
  }
}

function rgb(color) {
  const { red, green, blue, alpha } = style.color(color)

  return Color.rgb(red, green, blue, alpha)
}
