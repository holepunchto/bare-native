const UIKitActivityIndicatorView = require('bare-ui-kit/activity-indicator-view')
const UIKitColor = require('bare-ui-kit/color')

const NativeActivityIndicatorNode = require('../activity-indicator-node')
const Paint = require('../paint/apple')
const style = require('../style')

const SIZES = {
  small: UIKitActivityIndicatorView.STYLE.MEDIUM,
  large: UIKitActivityIndicatorView.STYLE.LARGE
}

module.exports = class NativeActivityIndicator extends NativeActivityIndicatorNode {
  constructor() {
    super()

    this._native = new UIKitActivityIndicatorView({ x: 0, y: 0, width: 0, height: 0 })

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

  return UIKitColor.rgb(red, green, blue, alpha)
}
