const NDK = require('bare-ndk')

const NativeScrollNode = require('../scroll-node')
const forward = require('../events')
const style = require('../style')
const { dp, px } = require('../metrics/android')

// A scroll position is in physical pixels, as every other length on Android
// is.
const EVENTS = { scroll: ['scroll', (x, y) => ({ x: dp(x), y: dp(y) })] }

function argb({ red, green, blue, alpha }) {
  return (
    (Math.round(alpha * 255) << 24) |
    (Math.round(red * 255) << 16) |
    (Math.round(green * 255) << 8) |
    Math.round(blue * 255)
  )
}

module.exports = class NativeScrollView extends NativeScrollNode {
  // Android has a class per axis rather than a property, so this is the one
  // platform where the choice is which view to make.
  _create(horizontal) {
    const view = horizontal ? new NDK.HorizontalScrollView() : new NDK.ScrollView()

    this._background = new NDK.GradientDrawable()

    view.background = this._background

    this._borderColor = style.color('#0000')
    this._borderWidth = 0

    forward(this, view, EVENTS)

    return view
  }

  get contentOffset() {
    const { x, y } = this._native.scrollPosition

    return { x: dp(x), y: dp(y) }
  }

  set contentOffset({ x = 0, y = 0 }) {
    this._native.scrollPosition = { x: px(x), y: px(y) }
  }

  _insert(child, index) {
    this._native.addView(child._native, 0)
  }

  _remove(child) {
    this._native.removeView(child._native)
  }

  // Android lays a scroll view's child out itself, from what the child says it
  // measures. A `FrameGroup` asked for its size with no bound on it answers
  // with the union of the frames it was given, so there is nothing to place.
  _place(child, x, y, width, height) {}

  _paint(properties) {
    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'backgroundColor':
          this._background.setColor(argb(style.color(value)))
          break
        case 'borderColor':
          this._borderColor = style.color(value)
          this._stroke()
          break
        case 'borderWidth':
          this._borderWidth = px(value)
          this._stroke()
          break
        case 'borderRadius':
          this._background.setCornerRadius(px(value))
          break
        case 'opacity':
          this._native.alpha = value
          break
        case 'overflow':
          this._native.clipToOutline = value === 'hidden'
          break
      }
    }
  }

  _stroke() {
    this._background.setStroke(this._borderWidth, argb(this._borderColor))
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeScrollView }
    }
  }
}
