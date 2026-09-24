const WinUI = require('bare-win-ui')

const NativeScrollNode = require('../scroll-node')
const forward = require('../events')

const EVENTS = { scroll: ['viewChanged', (offset) => offset] }

module.exports = class NativeScrollView extends NativeScrollNode {
  _create(horizontal) {
    const view = new WinUI.ScrollViewer()

    view.setScrollMode(horizontal, horizontal === false)

    forward(this, view, EVENTS)

    return view
  }

  get contentOffset() {
    return this._native.offset
  }

  set contentOffset({ x = 0, y = 0 }) {
    this._native.offset = { x, y }
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

  // Only opacity for now: a view paints its background and border through
  // composition objects sized from `_resized`, which a scroll view does not
  // have yet.
  _paint(properties) {
    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'opacity':
          this._native.opacity = value
          break
      }
    }
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeScrollView }
    }
  }
}
