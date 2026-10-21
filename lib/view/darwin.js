const AppKitView = require('bare-app-kit/view')

const NativeNode = require('../node')
const style = require('../style')
const Paint = require('../paint/apple')
const pointer = require('#pointer')

module.exports = class NativeView extends NativeNode {
  constructor() {
    super()

    this._native = new AppKitView()

    // A flipped view measures from the top left as Yoga does.
    this._native.flipped = true
    this._native.wantsLayer = true

    this._painter = new Paint(this._native, { group: true })

    pointer(this, this._native)
  }

  _insert(child, index) {
    const next = this._children[index]

    if (next === undefined) this._native.addSubview(child._native)
    else {
      this._native.addSubview(child._native, AppKitView.WINDOW_ORDERING_MODE.BELOW, next._native)
    }
  }

  _remove(child) {
    child._native.removeFromSuperview()
  }

  _place(child, x, y, width, height) {
    child._native.frame = { x, y, width, height }
  }

  // A border is a separate layer, so the painter needs the box size.
  _resized(width, height) {
    this._painter.resize(width, height)
  }

  _untransform() {
    this._painter.untransform()
  }

  _paint(properties) {
    if ('pointerEvents' in properties) {
      this._native.hitTestable = style.targets(properties.pointerEvents)
    }

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
