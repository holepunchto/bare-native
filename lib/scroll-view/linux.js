const GTKScrolledWindow = require('bare-gtk/scrolled-window')
const GTKViewport = require('bare-gtk/viewport')
const { POLICY_AUTOMATIC, POLICY_NEVER, SCROLL_NATURAL } = require('bare-gtk/constants')

const NativeScrollNode = require('../scroll-node')
const Paint = require('../paint/linux')
const forward = require('../events')

module.exports = class NativeScrollView extends NativeScrollNode {
  _create(horizontal) {
    const view = new GTKScrolledWindow()

    view.setPolicy(
      horizontal ? POLICY_AUTOMATIC : POLICY_NEVER,
      horizontal ? POLICY_NEVER : POLICY_AUTOMATIC
    )

    // A placed layout reports a minimum of zero, which the default scroll policy
    // would take as nothing to scroll, so the viewport is ours with a natural
    // policy.
    this._viewport = new GTKViewport()

    this._viewport.hscrollPolicy = SCROLL_NATURAL
    this._viewport.vscrollPolicy = SCROLL_NATURAL

    view.child = this._viewport

    // What scrolls is the adjustment, not the window.
    this._adjustment = horizontal ? view.hadjustment : view.vadjustment

    forward(this, this._adjustment, {
      scroll: ['valueChanged', (value) => (horizontal ? { x: value, y: 0 } : { x: 0, y: value })]
    })

    this._painter = new Paint(view)

    return view
  }

  _scrolled() {
    const value = this._adjustment.value

    return this._horizontal ? { x: value, y: 0 } : { x: 0, y: value }
  }

  _scroll(x, y) {
    this._adjustment.value = this._horizontal ? x : y
  }

  _insert(child, index) {
    this._viewport.child = child._native
  }

  _remove(child) {
    this._viewport.child = null
  }

  // A scrolled window sizes its child from its measurement, which the layout
  // manager answers with the union of its children's frames.
  _place(child, x, y, width, height) {}

  _paint(properties) {
    this._painter.apply(properties)
  }

  _destroy() {
    this._painter.destroy()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeScrollView }
    }
  }
}
