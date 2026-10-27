const WinUICanvas = require('bare-win-ui/canvas')
const WinUIElementCompositionPreview = require('bare-win-ui/element-composition-preview')
const WinUISolidColorBrush = require('bare-win-ui/solid-color-brush')

const style = require('../style')
const { around, IDENTITY } = require('../transform')
const path = require('#path')
const Cursor = require('#cursor')

// In multiples of the stroke width, since CSS leaves dash lengths to the
// platform.
const DASHES = { solid: null, dotted: [1, 1], dashed: [3, 2] }

const TRANSPARENT = { a: 0, r: 0, g: 0, b: 0 }

function bytes(value) {
  const { red, green, blue, alpha } = style.color(value)

  return {
    a: Math.round(alpha * 255),
    r: Math.round(red * 255),
    g: Math.round(green * 255),
    b: Math.round(blue * 255)
  }
}

// Clips, borders and shadows are composition objects in absolute pixels, so
// the box is passed through `resize()`.
module.exports = exports = class WindowsPaint {
  constructor(element, opts = {}) {
    const { clipped = false, panel = false } = opts

    this._element = element
    this._cursor = new Cursor(element)
    this._clipped = clipped

    // Composition visuals draw above an element's children, so the background
    // and border go in child elements kept behind the rest. Elements that cannot
    // hold children paint through their own properties and cast no shadow.
    this._panel = panel

    this._surface = null
    this._shade = null

    this._width = 0
    this._height = 0
    this._radius = 0
    this._corners = {}
    this._borderStyle = 'solid'
    this._overflow = 'visible'
    this._backgroundColor = style.color('#0000')
    this._borderColor = style.color('#0000')
    this._borderWidth = 0

    this._shadowColor = style.color('#000')
    this._shadowOffset = { width: 0, height: 0 }
    this._shadowOpacity = 0
    this._shadowRadius = 0

    this._visual = null
    this._clip = null
    this._paint = null
    this._shadow = null
  }

  get visual() {
    if (this._visual === null) {
      this._visual = WinUIElementCompositionPreview.getElementVisual(this._element)
    }

    return this._visual
  }

  _canvas(index) {
    const canvas = new WinUICanvas()

    WinUICanvas.setZIndex(canvas, index)

    this._element.children.append(canvas)

    return canvas
  }

  apply(properties) {
    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'backgroundColor':
          this._backgroundColor = style.color(value)

          // A transparent brush rather than null keeps the element hit-testable.
          this._element.background = new WinUISolidColorBrush({
            color: this._panel ? TRANSPARENT : bytes(value)
          })
          break
        case 'borderColor':
          this._borderColor = style.color(value)
          break
        case 'borderRadius':
          this._radius = value
          break
        case 'borderTopLeftRadius':
          this._corners.topLeft = value
          break
        case 'borderTopRightRadius':
          this._corners.topRight = value
          break
        case 'borderBottomRightRadius':
          this._corners.bottomRight = value
          break
        case 'borderBottomLeftRadius':
          this._corners.bottomLeft = value
          break
        case 'borderStyle':
          this._borderStyle = style.stroke(value)
          break
        case 'borderWidth':
          this._borderWidth = value
          break
        case 'cursor':
          this._cursor.set(style.pointer(value))
          break
        case 'opacity':
          this._element.opacity = value
          break
        case 'overflow':
          this._overflow = value
          break
        case 'shadowColor':
          this._shadowColor = style.color(value)
          break
        case 'shadowOffset':
          this._shadowOffset = value
          break
        case 'shadowOpacity':
          this._shadowOpacity = value
          break
        case 'shadowRadius':
          this._shadowRadius = value
          break
        case 'zIndex':
          WinUICanvas.setZIndex(this._element, value)
          break
      }
    }

    if ('transform' in properties) exports.transform(this._element, properties)

    this._composite()
  }

  resize(width, height) {
    this._width = width
    this._height = height

    this._composite()
  }

  _composite() {
    this._reclip()
    this._repaint()
    this._reshade()
  }

  // A panel rounds its own background, so only clipped boxes need a clip.
  // Elements without a panel clip according to their overflow.
  _reclip() {
    const radii = style.corners(this._radius, this._corners)
    const rounded = radii.some((radius) => radius > 0) && !this._panel

    if (this._clipped || this._overflow === 'hidden' || rounded) {
      if (this._clip === null) {
        this._clip = this.visual.compositor.createPathGeometry()
        this.visual.clip = this.visual.compositor.createGeometricClip(this._clip)
      }

      this._clip.path = path(this._width, this._height, radii)
    } else if (this._clip !== null) {
      this.visual.clip = null
      this._clip = null
    }
  }

  _repaint() {
    const width = this._width
    const height = this._height
    const radii = style.corners(this._radius, this._corners)
    const thickness = this._borderWidth

    const filled = this._panel && this._backgroundColor.alpha > 0
    const stroked = thickness > 0 && this._borderColor.alpha > 0

    if (!filled && !stroked) {
      if (this._paint !== null) {
        WinUIElementCompositionPreview.setElementChildVisual(this._surface, null)
        this._paint = null
      }

      return
    }

    if (this._paint === null) this._paint = this._createPaint()

    const { visual, background, border } = this._paint
    const inset = thickness / 2
    const dash = DASHES[this._borderStyle]

    visual.size = { x: width, y: height }

    background.brush.color = filled ? bytes(this._backgroundColor) : TRANSPARENT
    background.geometry.path = path(width, height, radii)

    // The border is inset by half its stroke, as CSS draws it inside the box.
    border.brush.color = stroked ? bytes(this._borderColor) : TRANSPARENT
    border.shape.strokeThickness = thickness
    border.shape.offset = { x: inset, y: inset }
    border.shape.strokeDashArray = dash === null ? [] : dash
    border.geometry.path = path(
      Math.max(0, width - thickness),
      Math.max(0, height - thickness),
      radii.map((radius) => Math.max(0, radius - inset))
    )
  }

  // A drop shadow takes its shape from a mask, so the rounded box is drawn
  // into a surface for it.
  _reshade() {
    const alpha = this._shadowColor.alpha * this._shadowOpacity

    if (alpha === 0 || !this._panel) {
      if (this._shadow !== null) {
        WinUIElementCompositionPreview.setElementChildVisual(this._shade, null)
        this._shadow = null
      }

      return
    }

    if (this._shadow === null) this._shadow = this._createShadow()

    const { visual, shadow, mask, geometry, surface } = this._shadow

    const width = this._width
    const height = this._height
    const { width: x = 0, height: y = 0 } = this._shadowOffset

    visual.size = { x: width, y: height }
    mask.size = { x: width, y: height }
    geometry.path = path(width, height, style.corners(this._radius, this._corners))
    surface.sourceSize = { x: width, y: height }

    shadow.color = bytes(this._shadowColor)
    shadow.opacity = this._shadowOpacity
    shadow.offset = { x, y, z: 0 }

    // CSS treats the blur radius as twice the standard deviation.
    shadow.blurRadius = this._shadowRadius * 2
  }

  _createPaint() {
    const compositor = this.visual.compositor

    const visual = compositor.createShapeVisual()

    const background = this._createShape(compositor)
    const border = this._createShape(compositor)

    background.shape.fillBrush = background.brush
    border.shape.strokeBrush = border.brush

    visual.shapes.append(background.shape)
    visual.shapes.append(border.shape)

    if (this._surface === null) this._surface = this._panel ? this._canvas(-1) : this._element

    WinUIElementCompositionPreview.setElementChildVisual(this._surface, visual)

    return { visual, background, border }
  }

  _createShape(compositor) {
    const geometry = compositor.createPathGeometry()

    return {
      geometry,
      shape: compositor.createSpriteShape(geometry),
      brush: compositor.createColorBrush()
    }
  }

  _createShadow() {
    const compositor = this.visual.compositor

    const geometry = compositor.createPathGeometry()
    const shape = compositor.createSpriteShape(geometry)
    const mask = compositor.createShapeVisual()
    const surface = compositor.createVisualSurface()
    const shadow = compositor.createDropShadow()
    const visual = compositor.createSpriteVisual()

    shape.fillBrush = compositor.createColorBrush({ a: 255, r: 0, g: 0, b: 0 })
    mask.shapes.append(shape)

    surface.sourceVisual = mask

    shadow.mask = compositor.createSurfaceBrush(surface)

    visual.shadow = shadow

    if (this._shade === null) this._shade = this._canvas(-2)

    WinUIElementCompositionPreview.setElementChildVisual(this._shade, visual)

    return { visual, shadow, mask, geometry, surface }
  }
}

// Set on the element rather than its visual, as XAML only sees a transform on
// the visual some frames later.
exports.transform = function transform(element, { transform: matrix, transformOrigin: origin }) {
  element.transformMatrix = matrix === null ? IDENTITY : around(matrix, origin)
}
