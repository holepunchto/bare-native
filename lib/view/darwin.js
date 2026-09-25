const AppKit = require('bare-app-kit')

const NativeNode = require('../node')
const Paint = require('../paint/apple')
const pointer = require('#pointer')

module.exports = class NativeView extends NativeNode {
  constructor() {
    super()

    this._native = new AppKit.View()

    // Yoga measures from the top left, which is what a flipped view uses, so
    // computed frames go across without conversion.
    this._native.flipped = true
    this._native.wantsLayer = true

    this._painter = new Paint(this._native)

    pointer(this, this._native)
  }

  get layer() {
    return this._painter.layer
  }

  _insert(child, index) {
    const next = this._children[index]

    if (next === undefined) this._native.addSubview(child._native)
    else {
      this._native.addSubview(child._native, AppKit.View.ORDERING.BELOW, next._native)
    }
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
