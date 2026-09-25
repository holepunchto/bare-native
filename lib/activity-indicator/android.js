const NDK = require('bare-ndk')

const NativeActivityIndicatorNode = require('../activity-indicator-node')
const Paint = require('../paint/android')
const style = require('../style')

// Android draws its indeterminate drawable at whatever size it is given and
// names its sizes through styles a widget cannot change after construction, so
// the two React Native names are the two the Apple platforms draw.
const SIZES = { small: 16, large: 32 }

function argb(color) {
  const { red, green, blue, alpha } = style.color(color)

  return (
    ((Math.round(alpha * 255) << 24) |
      (Math.round(red * 255) << 16) |
      (Math.round(green * 255) << 8) |
      Math.round(blue * 255)) >>
    0
  )
}

module.exports = class NativeActivityIndicator extends NativeActivityIndicatorNode {
  constructor() {
    super()

    this._native = new NDK.ProgressBar()

    this._native.indeterminate = true

    this._painter = new Paint(this._native)
  }

  _natural() {
    const size = SIZES[this._size]

    return { width: size, height: size }
  }

  // A progress bar that is not animating still draws itself, so not animating
  // is said through the view's own visibility, which leaves the box it was
  // given where the layout put it.
  _animate(animating) {
    this._native.visible = animating
  }

  _paint(properties) {
    this._painter.apply(properties)

    if ('color' in properties) {
      const value = properties.color

      if (value !== undefined) this._native.indeterminateTint = argb(value)
    }
  }

  _destroy() {}

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeActivityIndicator }
    }
  }
}
