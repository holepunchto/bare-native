const GTK = require('bare-gtk')

const NativeNode = require('../node')
const Paint = require('../paint/linux')
const pointer = require('#pointer')

module.exports = class NativeView extends NativeNode {
  constructor() {
    super()

    this._native = new GTK.FrameFixed()
    this._manager = this._native.layoutManager

    this._layoutChildren = new Map()

    this._painter = new Paint(this._native)

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

  _place(child, x, y, width, height) {
    this._layoutChildren.get(child).frame = [x, y, width, height]
  }

  _paint(properties) {
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
