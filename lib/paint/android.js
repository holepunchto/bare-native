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
    this._focus = null
  }

  // What the same view strokes itself with while it has the focus. Android
  // says that with a state on a drawable, and a drawable this layer built has
  // no states, so the stroke is swapped rather than selected.
  focus(stroke) {
    this._focus = stroke

    this._stroke()
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
    if (this._focus === null) {
      this._drawable.setStroke(this._borderWidth, argb(this._borderColor))
    } else {
      const { width, color } = this._focus

      this._drawable.setStroke(px(width), color)
    }
  }
}
