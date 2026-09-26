const NDKHorizontalScrollView = require('bare-ndk/horizontal-scroll-view')
const NDKScrollView = require('bare-ndk/scroll-view')

const NativeScrollNode = require('../scroll-node')
const Paint = require('../paint/android')
const forward = require('../events')
const { dp, px } = require('../metrics/android')

// A scroll position is in physical pixels, as every other length on Android
// is.
const EVENTS = { scroll: ['scrollChanged', (x, y) => ({ x: dp(x), y: dp(y) })] }

module.exports = class NativeScrollView extends NativeScrollNode {
  // Android has a class per axis rather than a property, so this is the one
  // platform where the choice is which view to make.
  _create(horizontal) {
    const view = horizontal ? new NDKHorizontalScrollView() : new NDKScrollView()

    forward(this, view, EVENTS)

    this._painter = new Paint(view)
    return view
  }

  get contentOffset() {
    return { x: dp(this._native.scrollX), y: dp(this._native.scrollY) }
  }

  set contentOffset({ x = 0, y = 0 }) {
    this._native.scrollTo(px(x), px(y))
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
    this._painter.apply(properties)
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeScrollView }
    }
  }
}
