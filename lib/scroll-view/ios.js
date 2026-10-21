const UIKitScrollView = require('bare-ui-kit/scroll-view')

const { CONTENT_INSET_ADJUSTMENT_BEHAVIOR: ADJUSTMENT } = UIKitScrollView

const NativeScrollNode = require('../scroll-node')
const forward = require('../events')
const Paint = require('../paint/apple')

const EVENTS = { scroll: ['didScroll', (offset) => offset] }

module.exports = class NativeScrollView extends NativeScrollNode {
  _create(horizontal) {
    const view = new UIKitScrollView()

    view.clipsToBounds = true

    // The tree is already laid out around the safe area through
    // `env(safe-area-inset-*)`, so UIKit must not inset the content again.
    view.contentInsetAdjustmentBehavior = ADJUSTMENT.NEVER

    forward(this, view, EVENTS)

    this._painter = new Paint(view)
    return view
  }

  _scrolled() {
    return this._native.contentOffset
  }

  _scroll(x, y) {
    this._native.contentOffset = { x, y }
  }

  _insert(child, index) {
    this._native.addSubview(child._native)
  }

  _remove(child) {
    child._native.removeFromSuperview()
  }

  // Unlike `NSScrollView`, a `UIScrollView` does not derive its content size from
  // its subviews.
  _place(child, x, y, width, height) {
    child._native.frame = { x, y, width, height }

    this._native.contentSize = { width, height }
  }

  // A border is a separate layer, so the painter needs the box size.
  _resized(width, height) {
    this._painter.resize(width, height)
  }

  _untransform() {
    this._painter.untransform()
  }

  _paint(properties) {
    this._painter.apply(properties)
  }

  _destroy() {
    this._native.removeFromSuperview()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeScrollView }
    }
  }
}
