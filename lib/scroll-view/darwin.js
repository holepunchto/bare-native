const AppKitClipView = require('bare-app-kit/clip-view')
const AppKitScrollView = require('bare-app-kit/scroll-view')

const NativeScrollNode = require('../scroll-node')
const forward = require('../events')
const Paint = require('../paint/apple')

module.exports = class NativeScrollView extends NativeScrollNode {
  _create(horizontal) {
    const view = new AppKitScrollView({ x: 0, y: 0, width: 0, height: 0 })

    // AppKit only gives a view a layer when asked to.
    view.wantsLayer = true

    view.drawsBackground = false
    view.hasVerticalScroller = horizontal === false
    view.hasHorizontalScroller = horizontal
    view.autohidesScrollers = true

    // The default clip view cannot report scrolling. Its bounds change notification
    // covers both programmatic and user scrolls.
    this._clip = new AppKitClipView({ x: 0, y: 0, width: 0, height: 0 })

    // The scroll view only forwards `drawsBackground` to the clip view it has at the
    // time, and the default control background is wrong in a light appearance.
    this._clip.drawsBackground = false

    view.contentView = this._clip

    forward(this, this._clip, {
      scroll: ['boundsDidChange', () => this.contentOffset]
    })

    this._painter = new Paint(view)
    return view
  }

  _scrolled() {
    const { x, y } = this._clip.bounds

    return { x, y }
  }

  _scroll(x, y) {
    this._clip.scrollToPoint(x, y)

    // Scrolling the clip view does not update the scroll view or its scrollers.
    this._native.reflectScrolledClipView(this._clip)
  }

  _insert(child, index) {
    this._native.documentView = child._native
  }

  _remove(child) {
    child._native.removeFromSuperview()
  }

  _place(child, x, y, width, height) {
    child._native.frame = { x, y, width, height }
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
