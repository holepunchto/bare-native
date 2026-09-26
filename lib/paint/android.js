const NDKGradientDrawable = require('bare-ndk/gradient-drawable')

const style = require('../style')
const transform = require('../transform')
const { depth, px } = require('../metrics/android')

const FLAT = 100000

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
  constructor(view, opts = {}) {
    const { group = false } = opts

    this._view = view
    this._group = group
    this._drawable = new NDKGradientDrawable()

    // Android clips a group's children to its box and CSS does not, so a view
    // starts out with the clipping its default overflow asks for.
    if (group) view.clipChildren = false

    this._view.background = this._drawable

    this._borderColor = style.color('#0000')
    this._borderWidth = 0
    this._focus = null
    this._matrix = null
    this._origin = null
    this._shadowColor = style.color('#000')
    this._shadowOffset = { width: 0, height: 0 }
    this._shadowOpacity = 0
    this._shadowRadius = 0

    // Android casts a shadow from how high a view is, and an order is written
    // on the same axis, so a box that only asked to be in front would cast one
    // it never asked for. The lights start transparent and a shadow turns them
    // on, which is what leaves the two independent.
    this._raise()
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

          if (this._group) this._view.clipChildren = value === 'hidden'
          break
        case 'shadowColor':
          this._shadowColor = style.color(value)
          this._raise()
          break
        case 'shadowOffset':
          this._shadowOffset = value
          this._raise()
          break
        case 'shadowOpacity':
          this._shadowOpacity = value
          this._raise()
          break
        case 'shadowRadius':
          this._shadowRadius = value
          this._raise()
          break
        case 'zIndex':
          // A `View` is in front of a sibling by being higher than it, which
          // is the axis a shadow is cast along as well. The two add rather
          // than compete: an elevation is how far the shadow reaches and a
          // translation is where the order puts it.
          this._view.translationZ = px(value)
          break
      }
    }

    if ('transform' in properties) this._transform(properties)
  }

  // A `View` is given the parts of the transform rather than the whole of it,
  // and composes them itself in a fixed order about a pivot. The pivot is the
  // origin, which is the one piece Android applies for itself.
  _transform({ transform: matrix, transformOrigin: origin }) {
    if (transform.equal(this._matrix, matrix) && transform.equal(this._origin, origin)) return

    this._matrix = matrix
    this._origin = origin

    const view = this._view

    if (matrix === null) {
      view.translationX = 0
      view.translationY = 0
      view.scaleX = 1
      view.scaleY = 1
      view.rotation = 0
      view.rotationX = 0
      view.rotationY = 0

      return
    }

    view.pivotX = px(origin[0])
    view.pivotY = px(origin[1])

    const parts = transform.decompose(matrix)

    // A matrix that cannot be taken apart is one that collapses the box onto
    // a line or a point, and a box of no width draws nothing, which is what
    // it would do everywhere else.
    if (parts === null) {
      view.scaleX = 0
      view.scaleY = 0

      return
    }

    view.translationX = px(parts.translate[0])
    view.translationY = px(parts.translate[1])
    view.scaleX = parts.scale[0]
    view.scaleY = parts.scale[1]
    view.rotationX = parts.rotate[0]
    view.rotationY = parts.rotate[1]
    view.rotation = parts.rotate[2]

    // Android puts a camera in front of the view where CSS puts the vanishing
    // point in the matrix, so a perspective is a distance to stand the camera
    // at. A rotation with no perspective is drawn flat, which is a camera so
    // far away that the projection is parallel.
    const vanishing = parts.perspective[2]

    view.cameraDistance = vanishing === 0 ? depth(FLAT) : Math.max(1, depth(-1 / vanishing))
  }

  // A `View` is not handed a shadow but casts one: the light is the window's
  // rather than the box's, so how far the box is raised decides how far the
  // shadow is thrown and how soft it is, and neither the offset nor the blur
  // can be asked for on its own. What crosses is how far the shadow reaches,
  // which is the larger of the two, and the colour, which Android does take.
  //
  // Raising a view also puts it in front of its siblings, which is what an
  // elevation means on this platform and is where `zIndex` will meet it.
  _raise() {
    const { width = 0, height = 0 } = this._shadowOffset

    const alpha = this._shadowColor.alpha * this._shadowOpacity

    const reach = alpha === 0 ? 0 : Math.max(this._shadowRadius, Math.abs(width), Math.abs(height))

    const color = argb({ ...this._shadowColor, alpha })

    this._view.outlineAmbientShadowColor = color
    this._view.outlineSpotShadowColor = color
    this._view.elevation = px(reach)
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
