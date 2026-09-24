const AppKit = require('bare-app-kit')
const { Layer } = require('bare-core-animation')

const NativeScrollNode = require('../scroll-node')
const forward = require('../events')
const style = require('../style')

// What the clip view reports is already a point in the units the tree is laid
// out in.
const EVENTS = { scroll: ['didScroll', (offset) => offset] }

const TRANSPARENT = style.color('#0000')

module.exports = class NativeScrollView extends NativeScrollNode {
  _create(horizontal) {
    const view = new AppKit.ScrollView({ x: 0, y: 0, width: 0, height: 0 })

    view.drawsBackground = false
    view.hasVerticalScroller = horizontal === false
    view.hasHorizontalScroller = horizontal
    view.autohidesScrollers = true

    this._backing = null

    forward(this, view, EVENTS)

    return view
  }

  get contentOffset() {
    return this._native.contentOffset
  }

  set contentOffset({ x = 0, y = 0 }) {
    this._native.contentOffset = { x, y }
  }

  get layer() {
    if (this._backing === null) {
      this._backing = Layer.of(this._native)

      this._backing.borderColor = TRANSPARENT
    }

    return this._backing
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
    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'backgroundColor':
          this.layer.backgroundColor = style.color(value)
          break
        case 'borderColor':
          this.layer.borderColor = style.color(value)
          break
        case 'borderRadius':
          this.layer.cornerRadius = value
          break
        case 'borderWidth':
          this.layer.borderWidth = value
          break
        case 'opacity':
          this.layer.opacity = value
          break
        case 'overflow':
          this.layer.masksToBounds = value === 'hidden'
          break
      }
    }
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
