const CoreAnimationLayer = require('bare-core-animation/layer')

const style = require('../style')
const transform = require('../transform')

const TRANSPARENT = style.color('#0000')

// Every Apple primitive paints through the layer of the view it holds, so what
// the six properties mean is written once rather than once per primitive.
module.exports = exports = class ApplePaint {
  constructor(view) {
    this._view = view
    this._layer = null
    this._border = null

    this._width = 0
    this._height = 0
    this._radius = 0
    this._matrix = null
    this._watching = false
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
  // paints a border before the children that sit on top of it. So the border
  // is a layer of its own, kept underneath the rest by depth rather than by
  // position in the list: a subview's layer takes the index its view took, so
  // where a foreign sublayer sits in that list is not ours to decide.
  get border() {
    if (this._border === null) {
      this._border = new CoreAnimationLayer()

      // A layer starts with an opaque black border, where the style model's
      // default is a transparent one, so a width on its own draws nothing
      // here as it draws nothing on the other platforms.
      this._border.borderColor = TRANSPARENT
      this._border.cornerRadius = this._radius

      this._border.zPosition = -1

      this.layer.addSublayer(this._border)

      this._resize()
    }

    return this._border
  }

  resize(width, height) {
    this._width = width
    this._height = height

    if (this._border !== null) this._resize()
  }

  _resize() {
    this._border.frame = { x: 0, y: 0, width: this._width, height: this._height }
  }

  apply(properties) {
    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'backgroundColor':
          this.layer.backgroundColor = style.color(value)
          break
        case 'borderColor':
          this.border.borderColor = style.color(value)
          break
        case 'borderRadius':
          this._radius = value

          this.layer.cornerRadius = value

          if (this._border !== null) this._border.cornerRadius = value
          break
        case 'borderWidth':
          this.border.borderWidth = value
          break
        case 'opacity':
          this.layer.opacity = value
          break
        case 'overflow':
          this.layer.masksToBounds = value === 'hidden'
          break
      }
    }

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

  // AppKit clears a layer-backed view's transform when it first realises the
  // layer tree, which is not a frame change and so cannot be seen from here.
  // The view says when it is about to draw, which is after that, and only a
  // view that carries a transform pays for hearing it.
  _watch() {
    if (this._watching || this._view.constructor._events?.willDraw === undefined) return

    this._watching = true

    this._view.on('willDraw', () => {
      if (this._matrix !== null) this.layer.transform = this._matrix
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
