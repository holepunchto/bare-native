const GTKFrameFixed = require('bare-gtk/frame-fixed')

const NativeNode = require('../node')
const style = require('../style')
const Paint = require('../paint/linux')
const pointer = require('#pointer')

module.exports = class NativeView extends NativeNode {
  constructor() {
    super()

    this._native = new GTKFrameFixed()
    this._manager = this._native.layoutManager

    this._layoutChildren = new Map()

    this._painter = new Paint(this._native, { group: true })

    pointer(this, this._native)
  }

  _insert(child, index) {
    const next = this._children[index]

    child._native.insertBefore(this._native, next === undefined ? null : next._native)

    this._layoutChildren.set(child, this._manager.getLayoutChild(child._native))
  }

  _remove(child) {
    this._layoutChildren.delete(child)

    child._native.unparent()
  }

  // A widget has no depth of its own on GTK: what a parent holds first is what
  // it paints first, so an order is the list made again rather than a property
  // written on a child. A stable sort, because equal depths keep the order
  // they were added in, which is what every other platform does with them.
  _ordered() {
    const painted = this._children
      .map((child, index) => ({ child, index }))
      .sort((a, b) => a.child._zIndex - b.child._zIndex || a.index - b.index)

    let previous = null

    for (const { child } of painted) {
      child._native.insertAfter(this._native, previous)

      previous = child._native
    }
  }

  _place(child, x, y, width, height) {
    this._layoutChildren.get(child).frame = [x, y, width, height]
  }

  _paint(properties) {
    if ('pointerEvents' in properties) {
      this._native.canTarget = style.targets(properties.pointerEvents)
    }

    this._painter.apply(properties)
  }

  _destroy() {
    this._painter.destroy()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeView }
    }
  }
}
