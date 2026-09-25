const UIKit = require('bare-ui-kit')

const NativeScrollNode = require('../scroll-node')
const forward = require('../events')
const Paint = require('../paint/apple')

// What the scroll view reports is already a point in the units the tree is
// laid out in.
const EVENTS = { scroll: ['didScroll', (offset) => offset] }

module.exports = class NativeScrollView extends NativeScrollNode {
  _create(horizontal) {
    // A `UIScrollView` scrolls whichever way its content size exceeds its
    // bounds, so the axis needs nothing here. Only the indicators would, and
    // they are not bound yet.
    const view = new UIKit.ScrollView()

    // The content is a subview taller than the view holding it, and a `UIView`
    // does not clip its subviews unless it is told to.
    view.clipsToBounds = true

    forward(this, view, EVENTS)

    this._painter = new Paint(view)
    return view
  }

  get contentOffset() {
    return this._native.contentOffset
  }

  set contentOffset({ x = 0, y = 0 }) {
    this._native.contentOffset = { x, y }
  }

  get layer() {
    return this._painter.layer
  }

  _insert(child, index) {
    this._native.addSubview(child._native)
  }

  _remove(child) {
    child._native.removeFromSuperview()
  }

  // A `UIScrollView` does not take what there is to scroll from its subviews,
  // where an `NSScrollView` takes it from the document view, so the content
  // size is stated as well as placed.
  _place(child, x, y, width, height) {
    child._native.frame = { x, y, width, height }

    this._native.contentSize = { width, height }
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
