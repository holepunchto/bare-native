const CoreAnimationLayer = require('bare-core-animation/layer')
const CoreAnimationShapeLayer = require('bare-core-animation/shape-layer')

const style = require('../style')
const transform = require('../transform')
const path = require('#path')
const Cursor = require('#cursor')

// A dash is a length on and a length off, in multiples of the stroke, which is
// what CSS leaves to the platform to choose.
const DASHES = { solid: null, dotted: [1, 1], dashed: [3, 2] }

const TRANSPARENT = style.color('#0000')

// Every Apple primitive paints through the layer of the view it holds, so what
// the painted properties mean is written once rather than once per primitive.
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

    // A backing layer clips what leaves it, where CSS shows it, so a view that
    // can hold others starts at the overflow the style model defaults to.
    if (group) {
      this._masks = false

      this._watch()
    }
  }

  // The layer is made on the first ask rather than with the view, because a
  // view nobody styles need not be backed by one.
  get layer() {
    if (this._layer === null) {
      this._layer = CoreAnimationLayer.of(this._view)
    }

    return this._layer
  }

  // A layer composites its own border above every sublayer it has, where CSS
  // paints a background and a border before the children that sit on top of
  // them. So both are drawn into layers of their own, kept underneath the rest
  // by depth rather than by position in the list: a subview's layer takes the
  // index its view took, so where a foreign sublayer sits in that list is not
  // ours to decide.
  //
  // They are shapes rather than a corner radius and a border width, because a
  // layer rounds all four corners by one radius and cannot dash a border, and
  // a path does both.
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

  // The background and the border are the same shape, the second inset by half
  // its own stroke because a stroke straddles the path it follows and CSS
  // draws a border inside the box.
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

  // A box hides what leaves it by masking, and a mask follows a shape where
  // `masksToBounds` only follows the box. The cheaper one is enough while
  // there is no corner to cut on.
  _clipped() {
    // Nothing is said about a box nobody asked to clip, because the toolkit
    // has its own answer: a scroll view clips what it scrolls whether or not
    // this layer has an opinion, and writing one would take that away.
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

    // A layer has an anchor point that is the origin already, but moving it
    // moves the layer, and the view's frame is what puts this one where it
    // belongs. So the origin is folded into the matrix instead.
    if ('transform' in properties) {
      this._watch()

      this._matrix =
        properties.transform === null
          ? null
          : transform.around(properties.transform, this._anchored(properties.transformOrigin))

      this.layer.transform = this._matrix ?? transform.IDENTITY
    }
  }

  // A layer turns its transform about its anchor point, which AppKit leaves in
  // the corner of the box and UIKit in the middle of it, so where the origin
  // is measured from is not the same on the two. What crosses is measured from
  // the corner, as CSS measures it, and the anchor is taken off here.
  _anchored([x, y]) {
    const anchor = this.layer.anchorPoint

    return [x - anchor.x * this._width, y - anchor.y * this._height]
  }

  // AppKit takes a layer-backed view's transform, its clipping and its shadow
  // from the view rather than from the layer, and writes all three onto the
  // layer whenever it realises the layer tree, which is not a change this
  // layer can see: a view with no `NSShadow` on it clears the layer's shadow
  // opacity, so a shadow set before the view was realised draws nothing. The
  // view says when it is about to draw, which is after that.
  _watch() {
    if (this._watching || this._view.constructor._events?.willDraw === undefined) return

    this._watching = true

    this._view.on('willDraw', () => {
      if (this._matrix !== null) this.layer.transform = this._matrix
      if (this._opacity > 0) this.layer.shadowOpacity = this._opacity
      if (this._masks !== null) this._clipped()
    })
  }

  // A view's frame is derived from its bounds and its transform together, so a
  // frame set while one is on it is compensated for rather than honoured:
  // AppKit drops the transform, UIKit scales the bounds to cancel it out. It
  // comes off before the box is written, and the pass that wrote the box puts
  // it back.
  untransform() {
    if (this._matrix !== null) this.layer.transform = transform.IDENTITY
  }
}
