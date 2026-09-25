const UIKit = require('bare-ui-kit')

const NativeNode = require('../node')
const pointer = require('#pointer')
const Paint = require('../paint/apple')

module.exports = class NativeView extends NativeNode {
  constructor() {
    super()

    this._native = new UIKit.View()

    this._painter = new Paint(this._native)

    pointer(this, this._native)
  }

  get layer() {
    return this._painter.layer
  }

  _insert(child, index) {
    this._native.insertSubviewAtIndex(child._native, index)
  }

  _remove(child) {
    child._native.removeFromSuperview()
  }

  _place(child, x, y, width, height) {
    child._native.frame = { x, y, width, height }
  }

  _paint(properties) {
    this._painter.apply(properties)
  }

  _destroy() {
    this._native.removeFromSuperview()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeView }
    }
  }
}
