const CoreAnimationLayer = require('bare-core-animation/layer')
const CoreAnimationShapeLayer = require('bare-core-animation/shape-layer')

const style = require('../style')
const transform = require('../transform')
const path = require('#path')
const Cursor = require('#cursor')

// In multiples of the stroke width, since CSS leaves dash lengths to the
// platform.
const DASHES = { solid: null, dotted: [1, 1], dashed: [3, 2] }

const TRANSPARENT = style.color('#0000')

module.exports = exports = class ApplePaint {
  constructor(view, opts = {}) {
    const { group = false } = opts

    this._view = view
    this._cursor = new Cursor(view)

    this._layer = null
    this._border = null
    this._fill = null
    this._clip = null

    this._width = 0
    this._height = 0
    this._radius = 0
    this._corners = {}
    this._backgroundColor = TRANSPARENT
    this._borderColor = TRANSPARENT
    this._borderWidth = 0
    this._borderStyle = 'solid'
    this._matrix = null
    this._opacity = 0
    this._masks = null
    this._watching = false

    // Layers clip their contents by default and CSS does not.
    if (group) {
      this._masks = false

      this._watch()
    }
  }

  get layer() {
    if (this._layer === null) {
      this._layer = CoreAnimationLayer.of(this._view)
    }

    return this._layer
  }

  // A layer draws its border above its sublayers, while CSS draws background
  // and border below the children. So both are separate shape layers kept
  // behind by `zPosition`, since subview layers control their own index. Shapes
  // also allow per-corner radii and dashed borders.
  get border() {
    if (this._border === null) {
      this._border = new CoreAnimationShapeLayer()

      this._border.fillColor = null
      this._border.zPosition = -1

      this.layer.addSublayer(this._border)
    }

    return this._border
  }

  get fill() {
    if (this._fill === null) {
      this._fill = new CoreAnimationShapeLayer()

      this._fill.strokeColor = null
      this._fill.zPosition = -2

      this.layer.addSublayer(this._fill)
    }

    return this._fill
  }

  resize(width, height) {
    this._width = width
    this._height = height

    this._draw()
  }

  // The border is inset by half its stroke, as CSS draws it inside the box.
  _draw() {
    this._clipped()

    const width = this._width
    const height = this._height
    const radii = style.corners(this._radius, this._corners)

    if (this._backgroundColor.alpha > 0 || this._fill !== null) {
      const fill = this.fill

      fill.frame = { x: 0, y: 0, width, height }
      fill.path = path(width, height, radii)
      fill.fillColor = this._backgroundColor
    }

    const stroked = this._borderWidth > 0 && this._borderColor.alpha > 0

    if (!stroked && this._border === null) return

    const border = this.border
    const inset = this._borderWidth / 2
    const dash = DASHES[this._borderStyle]

    border.frame = {
      x: inset,
      y: inset,
      width: Math.max(0, width - this._borderWidth),
      height: Math.max(0, height - this._borderWidth)
    }
    border.path = path(
      Math.max(0, width - this._borderWidth),
      Math.max(0, height - this._borderWidth),
      radii.map((radius) => Math.max(0, radius - inset))
    )
    border.strokeColor = stroked ? this._borderColor : null
    border.lineWidth = this._borderWidth
    border.lineDashPattern = dash === null ? [] : dash.map((part) => part * this._borderWidth)
  }

  // A mask follows rounded corners, but `masksToBounds` is cheaper when there
  // are none.
  _clipped() {
    // Leave unset boxes alone, since scroll views manage their own clipping.
    if (this._masks === null) return

    const radii = style.corners(this._radius, this._corners)

    if (this._masks !== true || radii.every((radius) => radius === 0)) {
      if (this._clip !== null) {
        this.layer.mask = null
        this._clip = null
      }

      this.layer.masksToBounds = this._masks === true

      return
    }

    if (this._clip === null) {
      this._clip = new CoreAnimationShapeLayer()

      this._clip.strokeColor = null
      this._clip.fillColor = { red: 0, green: 0, blue: 0, alpha: 1 }
    }

    this._clip.frame = { x: 0, y: 0, width: this._width, height: this._height }
    this._clip.path = path(this._width, this._height, radii)

    this.layer.masksToBounds = false
    this.layer.mask = this._clip
  }

  apply(properties) {
    let painted = false

    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'backgroundColor':
          this._backgroundColor = style.color(value)
          painted = true
          break
        case 'borderColor':
          this._borderColor = style.color(value)
          painted = true
          break
        case 'borderRadius':
          this._radius = value
          painted = true
          break
        case 'borderTopLeftRadius':
          this._corners.topLeft = value
          painted = true
          break
        case 'borderTopRightRadius':
          this._corners.topRight = value
          painted = true
          break
        case 'borderBottomRightRadius':
          this._corners.bottomRight = value
          painted = true
          break
        case 'borderBottomLeftRadius':
          this._corners.bottomLeft = value
          painted = true
          break
        case 'borderStyle':
          this._borderStyle = style.stroke(value)
          painted = true
          break
        case 'borderWidth':
          this._borderWidth = value
          painted = true
          break
        case 'cursor':
          this._cursor.set(style.pointer(value))
          break
        case 'opacity':
          this.layer.opacity = value
          break
        case 'overflow':
          this._watch()

          this._masks = value === 'hidden'

          painted = true
          break
        case 'shadowColor':
          this.layer.shadowColor = style.color(value)
          break
        case 'shadowOffset':
          this.layer.shadowOffset = value
          break
        case 'shadowOpacity':
          this._watch()

          this._opacity = value

          this.layer.shadowOpacity = value
          break
        case 'shadowRadius':
          this.layer.shadowRadius = value
          break
        case 'zIndex':
          this.layer.zPosition = value
          break
      }
    }

    if (painted) this._draw()

    // Moving the anchor point would move the layer, so the origin is folded into
    // the matrix instead.
    if ('transform' in properties) {
      this._watch()

      this._matrix =
        properties.transform === null
          ? null
          : transform.around(properties.transform, this._anchored(properties.transformOrigin))

      this.layer.transform = this._matrix ?? transform.IDENTITY
    }
  }

  // AppKit anchors layers at the corner and UIKit at the centre, so the anchor
  // is subtracted from the corner-relative origin.
  _anchored([x, y]) {
    const anchor = this.layer.anchorPoint

    return [x - anchor.x * this._width, y - anchor.y * this._height]
  }

  // AppKit overwrites the layer's transform, clipping and shadow from the view
  // when it realises the layer tree, so they are reapplied before drawing.
  _watch() {
    if (this._watching || this._view.constructor._events?.willDraw === undefined) return

    this._watching = true

    this._view.on('willDraw', () => {
      if (this._matrix !== null) this.layer.transform = this._matrix
      if (this._opacity > 0) this.layer.shadowOpacity = this._opacity
      if (this._masks !== null) this._clipped()
    })
  }

  // A frame set while a transform is applied is distorted by it, so the
  // transform is removed before layout and restored afterwards.
  untransform() {
    if (this._matrix !== null) this.layer.transform = transform.IDENTITY
  }
}
