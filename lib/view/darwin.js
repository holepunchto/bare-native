const AppKitView = require('bare-app-kit/view')

const NativeNode = require('../node')
const Paint = require('../paint/apple')
const pointer = require('#pointer')

module.exports = class NativeView extends NativeNode {
  constructor() {
    super()

    this._native = new AppKitView()

    // Yoga measures from the top left, which is what a flipped view uses, so
    // computed frames go across without conversion.
    this._native.flipped = true
    this._native.wantsLayer = true

    this._painter = new Paint(this._native, { group: true })

    pointer(this, this._native)
  }

  get layer() {
    return this._painter.layer
  }

  _insert(child, index) {
    const next = this._children[index]

    if (next === undefined) this._native.addSubview(child._native)
    else {
      this._native.addSubview(child._native, AppKitView.ORDERING.BELOW, next._native)
    }
  }

  _remove(child) {
    child._native.removeFromSuperview()
  }

  _place(child, x, y, width, height) {
    child._native.frame = { x, y, width, height }
  }

  // A border is a layer of its own beneath the content, so what paints has to
  // be told the box it is drawing.
  _resized(width, height) {
    this._painter.resize(width, height)
  }

  _untransform() {
    this._painter.untransform()
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
