const NDKFrameGroup = require('bare-ndk/frame-group')

const NativeNode = require('../node')
const Paint = require('../paint/android')
const pointer = require('#pointer')
const { px } = require('../metrics/android')

module.exports = class NativeView extends NativeNode {
  constructor() {
    super()

    this._native = new NDKFrameGroup()

    this._painter = new Paint(this._native, { group: true })

    pointer(this, this._native)
  }

  _insert(child, index) {
    this._native.addView(child._native, index)
  }

  _remove(child) {
    this._native.removeView(child._native)
  }

  // Each edge is rounded where it lands, so boxes sharing one still share it.
  _place(child, x, y, width, height) {
    const left = px(x)
    const top = px(y)

    this._native.setFrame(child._native, left, top, px(x + width) - left, px(y + height) - top)
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
