const WinUI = require('bare-win-ui')

const NativeScrollNode = require('../scroll-node')
const Paint = require('../paint/win32')
const forward = require('../events')

const { SCROLL_MODE, SCROLL_BAR_VISIBILITY } = WinUI.ScrollViewer

module.exports = class NativeScrollView extends NativeScrollNode {
  _create(horizontal) {
    const view = new WinUI.ScrollViewer()

    view.horizontalScrollMode = horizontal ? SCROLL_MODE.AUTO : SCROLL_MODE.DISABLED
    view.verticalScrollMode = horizontal ? SCROLL_MODE.DISABLED : SCROLL_MODE.AUTO

    view.horizontalScrollBarVisibility = horizontal
      ? SCROLL_BAR_VISIBILITY.AUTO
      : SCROLL_BAR_VISIBILITY.DISABLED

    view.verticalScrollBarVisibility = horizontal
      ? SCROLL_BAR_VISIBILITY.DISABLED
      : SCROLL_BAR_VISIBILITY.AUTO

    // What the event carries is whether the view is still moving, so where it
    // moved to is read back the way it is on every other platform.
    forward(this, view, { scroll: ['viewChanged', () => this.contentOffset] })

    this._painter = new Paint(view)
    return view
  }

  get contentOffset() {
    return { x: this._native.horizontalOffset, y: this._native.verticalOffset }
  }

  set contentOffset({ x = 0, y = 0 }) {
    this._native.changeView(x, y, null, true)
  }

  _insert(child, index) {
    this._native.content = child._native
  }

  _remove(child) {
    this._native.content = null
  }

  // A scroll viewer measures its content, and a canvas measures as nothing, so
  // the content is given the size Yoga gave it the way every other element
  // here is given one.
  _place(child, x, y, width, height) {
    child._native.width = width
    child._native.height = height
  }

  _resized(width, height) {
    this._painter.resize(width, height)
  }

  _paint(properties) {
    this._painter.apply(properties)
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeScrollView }
    }
  }
}
