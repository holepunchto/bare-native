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

  // GTK paints children in list order, so z-order is applied by reordering. The
  // sort is stable so equal depths keep insertion order, as on other platforms.
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
