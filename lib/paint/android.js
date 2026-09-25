const NDK = require('bare-ndk')

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

// A view carries a background colour and nothing else, so the colour, the
// corners and the border are one drawable rather than three properties, and
// every primitive that paints makes one.
module.exports = exports = class AndroidPaint {
  constructor(view) {
    this._view = view
    this._drawable = new NDK.GradientDrawable()

    this._view.background = this._drawable

    this._borderColor = style.color('#0000')
    this._borderWidth = 0
  }

  apply(properties) {
    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'backgroundColor':
          this._drawable.setColor(argb(style.color(value)))
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
          this._drawable.setCornerRadius(px(value))
          break
        case 'opacity':
          this._view.alpha = value
          break
        case 'overflow':
          this._view.clipToOutline = value === 'hidden'
          break
      }
    }
  }

  _stroke() {
    this._drawable.setStroke(this._borderWidth, argb(this._borderColor))
  }
}
