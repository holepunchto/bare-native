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

    this._pending = false

    // The event only says whether the view is still moving, so the offset is read
    // back.
    forward(this, view, { scroll: ['viewChanged', () => this.contentOffset] })

    // A scroll viewer is a control rather than a panel, so it casts no shadow.
    this._painter = new Paint(view)
    return view
  }

  // `ChangeView` scrolls on the next layout pass, so a read after a scroll forces
  // that pass. It is forced only then, because it also runs any other pending
  // layout.
  _scrolled() {
    if (this._pending) {
      this._pending = false

      this._native.updateLayout()
    }

    return { x: this._native.horizontalOffset, y: this._native.verticalOffset }
  }

  _scroll(x, y) {
    this._pending = this._native.changeView(x, y, null, true) || this._pending
  }

  // A XAML element given a size is otherwise centred in its container.
  _insert(child, index) {
    child._native.horizontalAlignment = WinUIFrameworkElement.HORIZONTAL_ALIGNMENT.LEFT
    child._native.verticalAlignment = WinUIFrameworkElement.VERTICAL_ALIGNMENT.TOP

    this._native.content = child._native
  }

  _remove(child) {
    this._native.content = null
  }

  // A canvas measures as nothing, so the scroll viewer needs an explicit size.
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
