const WinUIFrameworkElement = require('bare-win-ui/framework-element')
const WinUIScrollViewer = require('bare-win-ui/scroll-viewer')

const NativeScrollNode = require('../scroll-node')
const Paint = require('../paint/win32')
const forward = require('../events')

const { SCROLL_MODE, SCROLL_BAR_VISIBILITY } = WinUIScrollViewer

module.exports = class NativeScrollView extends NativeScrollNode {
  _create(horizontal) {
    const view = new WinUIScrollViewer()

    view.horizontalScrollMode = horizontal ? SCROLL_MODE.AUTO : SCROLL_MODE.DISABLED
    view.verticalScrollMode = horizontal ? SCROLL_MODE.DISABLED : SCROLL_MODE.AUTO

    view.horizontalScrollBarVisibility = horizontal
      ? SCROLL_BAR_VISIBILITY.AUTO
      : SCROLL_BAR_VISIBILITY.DISABLED

    view.verticalScrollBarVisibility = horizontal
      ? SCROLL_BAR_VISIBILITY.DISABLED
      : SCROLL_BAR_VISIBILITY.AUTO

    this._target = null
    this._onsettled = this._settled.bind(this)

    // What the event carries is whether the view is still moving, so where it
    // moved to is read back the way it is on every other platform.
    forward(this, view, { scroll: ['viewChanged', () => this.contentOffset] })

    // A scroll viewer is a control rather than a panel, so it has nowhere
    // behind its content to keep a shadow and casts none.
    this._painter = new Paint(view)
    return view
  }

  _scrolled() {
    if (this._target !== null) return this._target

    return { x: this._native.horizontalOffset, y: this._native.verticalOffset }
  }

  // `ChangeView` scrolls once the view next lays out rather than during the
  // call, so where it was asked to go is what reads back until then, as the
  // other four report an offset the moment it is set. Any change to the view
  // means the offsets it reports are current again, whoever made it. The view
  // is only listened to while that is pending, so a view nobody scrolls costs
  // nothing, and ahead of a `scroll` listener, so the event reads the offsets
  // the view reports.
  _scroll(x, y) {
    const pending = this._target !== null

    this._target = this._native.changeView(x, y, null, true) ? { x, y } : null

    if (pending === (this._target !== null)) return

    if (pending) this._native.off('viewChanged', this._onsettled)
    else this._native.prependListener('viewChanged', this._onsettled)
  }

  _settled() {
    this._target = null

    this._native.off('viewChanged', this._onsettled)
  }

  // A XAML element stretches to fill what it is given, and one given a size as
  // well is centred in what is left. The content here is sized by the layout,
  // so where it sits is said rather than left to that.
  _insert(child, index) {
    child._native.horizontalAlignment = WinUIFrameworkElement.HORIZONTAL_ALIGNMENT.LEFT
    child._native.verticalAlignment = WinUIFrameworkElement.VERTICAL_ALIGNMENT.TOP

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
