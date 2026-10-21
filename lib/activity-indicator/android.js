const NDKProgressBar = require('bare-ndk/progress-bar')

const NativeActivityIndicatorNode = require('../activity-indicator-node')
const Paint = require('../paint/android')
const style = require('../style')

// Android names its sizes through styles that cannot change after construction,
// so the sizes are set in pixels to match the Apple platforms.
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

    this._native = new NDKProgressBar()

    this._native.indeterminate = true

    this._painter = new Paint(this._native)
  }

  _natural() {
    const size = SIZES[this._size]

    return { width: size, height: size }
  }

  // A progress bar still draws when not animating, so it is hidden through its
  // visibility, which keeps its place in the layout.
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
