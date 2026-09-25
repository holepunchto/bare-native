const AppKit = require('bare-app-kit')

const NativeScrollNode = require('../scroll-node')
const forward = require('../events')
const Paint = require('../paint/apple')

module.exports = class NativeScrollView extends NativeScrollNode {
  _create(horizontal) {
    const view = new AppKit.ScrollView({ x: 0, y: 0, width: 0, height: 0 })

    view.drawsBackground = false
    view.hasVerticalScroller = horizontal === false
    view.hasHorizontalScroller = horizontal
    view.autohidesScrollers = true

    // The clip view a scroll view makes for itself is a plain one, which has
    // no way to say it scrolled. Bounds changing is what AppKit calls that,
    // and it covers a programmatic scroll as well as the user's.
    this._clip = new AppKit.ClipView({ x: 0, y: 0, width: 0, height: 0 })

    // A scroll view told not to draw a background tells the clip view it has
    // at the time, and this one arrives after, so it is told itself. Its own
    // default is the control background, which is dark in a dark appearance
    // and all but invisible against a light one.
    this._clip.drawsBackground = false

    view.contentView = this._clip

    forward(this, this._clip, {
      scroll: ['boundsDidChange', () => this.contentOffset]
    })

    this._painter = new Paint(view)
    return view
  }

  get contentOffset() {
    const { x, y } = this._clip.bounds

    return { x, y }
  }

  set contentOffset({ x = 0, y = 0 }) {
    this._clip.scrollToPoint(x, y)

    // A clip view told to scroll has not told the scroll view, so the
    // scrollers and anything else reading the offset are brought up to date.
    this._native.reflectScrolledClipView(this._clip)
  }

  get layer() {
    return this._painter.layer
  }

  _insert(child, index) {
    this._native.documentView = child._native
  }

  _remove(child) {
    child._native.removeFromSuperview()
  }

  // An `NSScrollView` takes what there is to scroll from the size of its
  // document view, which is the size Yoga gave the content.
  _place(child, x, y, width, height) {
    child._native.frame = { x, y, width, height }
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
