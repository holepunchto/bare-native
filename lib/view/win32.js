const WinUI = require('bare-win-ui')

const NativeNode = require('../node')
const style = require('../style')

const { Canvas, ElementCompositionPreview } = WinUI

function bytes(value) {
  const { red, green, blue, alpha } = style.color(value)

  return {
    a: Math.round(alpha * 255),
    r: Math.round(red * 255),
    g: Math.round(green * 255),
    b: Math.round(blue * 255)
  }
}

module.exports = class NativeView extends NativeNode {
  constructor() {
    super()

    this._native = new Canvas()

    this._width = 0
    this._height = 0
    this._radius = 0
    this._overflow = 'visible'
    this._borderColor = style.color('#0000')
    this._borderWidth = 0

    this._visual = null
    this._clip = null
    this._border = null
  }

  get visual() {
    if (this._visual === null) {
      this._visual = ElementCompositionPreview.getElementVisual(this._native)
    }

    return this._visual
  }

  _insert(child, index) {
    this._native.children.insertAt(index, child._native)
  }

  _remove(child) {
    const children = this._native.children

    children.removeAt(children.indexOf(child._native))
  }

  _place(child, x, y, width, height) {
    Canvas.setLeft(child._native, x)
    Canvas.setTop(child._native, y)

    child._native.width = width
    child._native.height = height
  }

  // The clip and the border are composition objects in absolute pixels, so
  // this view has to be told the box it is drawing where a layer and a CSS
  // node take it from the view they belong to.
  _resized(width, height) {
    this._width = width
    this._height = height

    this._composite()
  }

  _paint(properties) {
    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'backgroundColor':
          this._native.background = new WinUI.SolidColorBrush({ color: bytes(value) })
          break
        case 'borderColor':
          this._borderColor = style.color(value)
          break
        case 'borderRadius':
          this._radius = value
          break
        case 'borderWidth':
          this._borderWidth = value
          break
        case 'opacity':
          this._native.opacity = value
          break
        case 'overflow':
          this._overflow = value
          break
      }
    }

    this._composite()
  }

  // A rounded corner clips even when overflow is visible, as a background
  // cannot be rounded any other way.
  _composite() {
    const width = this._width
    const height = this._height
    const radius = this._radius
    const thickness = this._borderWidth

    if (this._overflow === 'hidden' || radius > 0) {
      if (this._clip === null) {
        this._clip = this.visual.compositor.createRoundedRectangleGeometry()
        this.visual.clip = this.visual.compositor.createGeometricClip(this._clip)
      }

      this._clip.size = { x: width, y: height }
      this._clip.cornerRadius = { x: radius, y: radius }
    } else if (this._clip !== null) {
      this.visual.clip = null
      this._clip = null
    }

    if (thickness > 0 && this._borderColor.alpha > 0) {
      if (this._border === null) this._border = this._createBorder()

      const { visual, shape, geometry, brush } = this._border
      const inset = thickness / 2

      visual.size = { x: width, y: height }
      brush.color = bytes(this._borderColor)
      shape.strokeThickness = thickness
      geometry.offset = { x: inset, y: inset }
      geometry.size = { x: Math.max(0, width - thickness), y: Math.max(0, height - thickness) }
      geometry.cornerRadius = { x: Math.max(0, radius - inset), y: Math.max(0, radius - inset) }
    } else if (this._border !== null) {
      ElementCompositionPreview.setElementChildVisual(this._native, null)
      this._border = null
    }
  }

  _createBorder() {
    const compositor = this.visual.compositor

    const geometry = compositor.createRoundedRectangleGeometry()
    const shape = compositor.createSpriteShape(geometry)
    const visual = compositor.createShapeVisual()
    const brush = compositor.createColorBrush()

    shape.strokeBrush = brush
    visual.shapes.append(shape)

    ElementCompositionPreview.setElementChildVisual(this._native, visual)

    return { visual, shape, geometry, brush }
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeView }
    }
  }
}
