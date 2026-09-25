const GTK = require('bare-gtk')

const NativeScrollNode = require('../scroll-node')
const Paint = require('../paint/linux')
const forward = require('../events')

const { POLICY_AUTOMATIC, POLICY_NEVER, SCROLL_NATURAL } = GTK.constants

module.exports = class NativeScrollView extends NativeScrollNode {
  _create(horizontal) {
    const view = new GTK.ScrolledWindow()

    view.setPolicy(
      horizontal ? POLICY_AUTOMATIC : POLICY_NEVER,
      horizontal ? POLICY_NEVER : POLICY_AUTOMATIC
    )

    // The viewport is ours rather than the one a scrolled window would make,
    // because its scroll policy has to say natural: a layout that is placed
    // rather than measured reports a minimum of zero, and the default policy
    // would take that as there being nothing to scroll.
    this._viewport = new GTK.Viewport()

    this._viewport.hscrollPolicy = SCROLL_NATURAL
    this._viewport.vscrollPolicy = SCROLL_NATURAL

    view.child = this._viewport

    // What scrolls is the adjustment, not the window, so the position is read
    // and reported there.
    this._adjustment = horizontal ? view.hadjustment : view.vadjustment

    forward(this, this._adjustment, {
      scroll: ['value-changed', (value) => (horizontal ? { x: value, y: 0 } : { x: 0, y: value })]
    })

    this._painter = new Paint(view)

    return view
  }

  get contentOffset() {
    const value = this._adjustment.value

    return this._horizontal ? { x: value, y: 0 } : { x: 0, y: value }
  }

  set contentOffset({ x = 0, y = 0 }) {
    this._adjustment.value = this._horizontal ? x : y
  }

  _insert(child, index) {
    this._viewport.child = child._native
  }

  _remove(child) {
    this._viewport.child = null
  }

  // A scrolled window sizes its child from what the child asks for, which the
  // layout manager answers with the union of the frames it was given.
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
