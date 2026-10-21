const NDKHorizontalScrollView = require('bare-ndk/horizontal-scroll-view')
const NDKScrollView = require('bare-ndk/scroll-view')

const NativeScrollNode = require('../scroll-node')
const Paint = require('../paint/android')
const forward = require('../events')
const { dp, px } = require('../metrics/android')

const EVENTS = { scroll: ['scrollChanged', (x, y) => ({ x: dp(x), y: dp(y) })] }

module.exports = class NativeScrollView extends NativeScrollNode {
  _create(horizontal) {
    const view = horizontal ? new NDKHorizontalScrollView() : new NDKScrollView()

    forward(this, view, EVENTS)

    // The parent may not clip, so the scroll view clips its own content.
    view.clipToOutline = true

    this._painter = new Paint(view)
    return view
  }

  _scrolled() {
    return { x: dp(this._native.scrollX), y: dp(this._native.scrollY) }
  }

  _scroll(x, y) {
    this._native.scrollTo(px(x), px(y))
  }

  _insert(child, index) {
    this._native.addView(child._native, 0)
  }

  _remove(child) {
    this._native.removeView(child._native)
  }

  // Android lays out the child from its measurement, which for a `FrameGroup` is
  // the union of its children's frames.
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
