const GTKSpinner = require('bare-gtk/spinner')
const { ORIENTATION_HORIZONTAL, ORIENTATION_VERTICAL } = require('bare-gtk/constants')

const NativeActivityIndicatorNode = require('../activity-indicator-node')
const Paint = require('../paint/linux')
const style = require('../style')

// GTK draws a spinner at whatever size its style asks for and names no sizes
// of its own, so the two React Native names are the two the Apple platforms
// draw, said in the one place GTK takes a size from.
const SIZES = { small: 16, large: 32 }

function rgba({ red, green, blue, alpha }) {
  return `rgba(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)}, ${alpha})`
}

module.exports = class NativeActivityIndicator extends NativeActivityIndicatorNode {
  constructor() {
    super()

    this._native = new GTKSpinner()

    this._painter = new Paint(this._native)

    this._own = {}

    this._restyle()

    this._native.spinning = true
  }

  _natural() {
    const [, width] = this._native.measure(ORIENTATION_HORIZONTAL)
    const [, height] = this._native.measure(ORIENTATION_VERTICAL)

    return { width, height }
  }

  // A spinner that is not spinning still draws itself, so not animating is
  // said in the stylesheet: a hidden widget measures nothing, and the box an
  // indicator was given is the layout's rather than the widget's.
  _animate(animating) {
    this._native.spinning = animating

    this._restyle()
  }

  _sized() {
    this._restyle()
  }

  _paint(properties) {
    this._painter.apply(properties)

    if ('color' in properties) {
      this._own.color = properties.color

      this._restyle()
    }
  }

  // A size and a colour are both the stylesheet's here, as they are for a text
  // input, and GTK takes them through the class the painter already gave this
  // widget.
  _restyle() {
    const { color } = this._own
    const size = SIZES[this._size]

    this._painter.declare({
      'min-width': `${size}px`,
      'min-height': `${size}px`,
      opacity: this._animating ? null : 0,
      color: color === undefined ? null : rgba(style.color(color))
    })
  }

  _destroy() {
    this._painter.destroy()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeActivityIndicator }
    }
  }
}
