const NDK = require('bare-ndk')

const NativeNode = require('../node')
const pointer = require('#pointer')
const style = require('../style')
const { px } = require('../metrics/android')

function argb({ red, green, blue, alpha }) {
  return (
    (Math.round(alpha * 255) << 24) |
    (Math.round(red * 255) << 16) |
    (Math.round(green * 255) << 8) |
    Math.round(blue * 255)
  )
}

module.exports = class NativeView extends NativeNode {
  constructor() {
    super()

    this._native = new NDK.FrameGroup()

    // A view carries a background colour and nothing else, so the colour, the
    // corners and the border are one drawable rather than three properties.
    this._background = new NDK.GradientDrawable()

    this._native.background = this._background

    this._borderColor = style.color('#0000')
    this._borderWidth = 0

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
    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'backgroundColor':
          this._background.setColor(argb(style.color(value)))
          break
        case 'borderColor':
          this._borderColor = style.color(value)
          this._stroke()
          break
        case 'borderWidth':
          this._borderWidth = px(value)
          this._stroke()
          break
        case 'borderRadius':
          this._background.setCornerRadius(px(value))
          break
        case 'opacity':
          this._native.alpha = value
          break
        case 'overflow':
          this._native.clipToOutline = value === 'hidden'
          break
      }
    }
  }

  _stroke() {
    this._background.setStroke(this._borderWidth, argb(this._borderColor))
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeView }
    }
  }
}
