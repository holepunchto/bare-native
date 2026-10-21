const NDKGradientDrawable = require('bare-ndk/gradient-drawable')

const style = require('../style')
const transform = require('../transform')
const { depth, px } = require('../metrics/android')
const Cursor = require('#cursor')

const FLAT = 100000

const DASHES = { solid: null, dotted: [1, 1], dashed: [3, 2] }

function argb({ red, green, blue, alpha }) {
  return (
    (Math.round(alpha * 255) << 24) |
    (Math.round(red * 255) << 16) |
    (Math.round(green * 255) << 8) |
    Math.round(blue * 255)
  )
}

// A view has only a background, so colour, corners and border are drawn by a
// single drawable.
module.exports = exports = class AndroidPaint {
  constructor(view, opts = {}) {
    const { group = false } = opts

    this._view = view
    this._cursor = new Cursor(view)
    this._group = group
    this._drawable = new NDKGradientDrawable()

    // Android clips a group's children and CSS does not.
    if (group) view.clipChildren = false

    this._view.background = this._drawable

    this._borderColor = style.color('#0000')
    this._borderWidth = 0
    this._borderStyle = 'solid'
    this._radius = 0
    this._corners = {}
    this._focus = null
    this._matrix = null
    this._origin = null
    this._shadowColor = style.color('#000')
    this._shadowOffset = { width: 0, height: 0 }
    this._shadowOpacity = 0
    this._shadowRadius = 0

    // Elevation casts a shadow, so the shadow colours start transparent to keep
    // `zIndex` from casting one.
    this._raise()
  }

  // Drawables built here have no states, so the focus stroke is swapped in.
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
          this._radius = value
          this._round()
          break
        case 'borderTopLeftRadius':
          this._corners.topLeft = value
          this._round()
          break
        case 'borderTopRightRadius':
          this._corners.topRight = value
          this._round()
          break
        case 'borderBottomRightRadius':
          this._corners.bottomRight = value
          this._round()
          break
        case 'borderBottomLeftRadius':
          this._corners.bottomLeft = value
          this._round()
          break
        case 'borderStyle':
          this._borderStyle = style.stroke(value)
          this._stroke()
          break
        case 'cursor':
          this._cursor.set(style.pointer(value))
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
          // Elevation and translation add up: elevation sets the shadow and
          // translation the order.
          this._view.translationZ = px(value)
          break
      }
    }

    if ('transform' in properties) this._transform(properties)
  }

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

    // A matrix that cannot be decomposed collapses the box, so draw nothing.
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

    // Android places a camera where CSS uses a vanishing point. Without
    // perspective, the camera is placed far enough away to draw flat.
    const vanishing = parts.perspective[2]

    view.cameraDistance = vanishing === 0 ? depth(FLAT) : Math.max(1, depth(-1 / vanishing))
  }

  // Android casts shadows from elevation, so offset and blur cannot be set
  // independently. Elevation also orders siblings, which `zIndex` builds on.
  _raise() {
    const { width = 0, height = 0 } = this._shadowOffset

    const alpha = this._shadowColor.alpha * this._shadowOpacity

    // The blur and offset combined, as taking only the larger left the shadow
    // far too shallow.
    const reach = alpha === 0 ? 0 : this._shadowRadius + Math.max(Math.abs(width), Math.abs(height))

    const color = argb({ ...this._shadowColor, alpha })

    this._view.outlineAmbientShadowColor = color
    this._view.outlineSpotShadowColor = color
    this._view.elevation = px(reach)
  }

  _round() {
    const radii = []

    for (const radius of style.corners(this._radius, this._corners)) {
      radii.push(px(radius), px(radius))
    }

    this._drawable.setCornerRadii(radii)
  }

  _stroke() {
    if (this._focus === null) {
      const dash = DASHES[this._borderStyle]

      if (dash === null) this._drawable.setStroke(this._borderWidth, argb(this._borderColor))
      else {
        this._drawable.setStroke(
          this._borderWidth,
          argb(this._borderColor),
          dash[0] * this._borderWidth,
          dash[1] * this._borderWidth
        )
      }
    } else {
      const { width, color } = this._focus

      this._drawable.setStroke(px(width), color)
    }
  }
}
