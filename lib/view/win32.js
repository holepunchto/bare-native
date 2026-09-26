const WinUICanvas = require('bare-win-ui/canvas')

const NativeNode = require('../node')
const Paint = require('../paint/win32')
const pointer = require('#pointer')

module.exports = class NativeView extends NativeNode {
  constructor() {
    super()

    this._native = new WinUICanvas()

    this._painter = new Paint(this._native, { panel: true })

    pointer(this, this._native)
  }

  _insert(child, index) {
    this._native.children.insertAt(index, child._native)
  }

  _remove(child) {
    const children = this._native.children

    children.removeAt(children.indexOf(child._native))
  }

  _place(child, x, y, width, height) {
    WinUICanvas.setLeft(child._native, x)
    WinUICanvas.setTop(child._native, y)

    child._native.width = width
    child._native.height = height
  }

  // A clip and a border are composition objects in absolute pixels, so this
  // view has to be told the box it is drawing where a layer and a CSS node
  // take it from the view they belong to.
  _resized(width, height) {
    this._painter.resize(width, height)
  }

  _paint(properties) {
    this._painter.apply(properties)
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeView }
    }
  }
}
