const WinUICanvas = require('bare-win-ui/canvas')
const WinUIElementCompositionPreview = require('bare-win-ui/element-composition-preview')
const WinUISolidColorBrush = require('bare-win-ui/solid-color-brush')

const style = require('../style')
const { around, IDENTITY } = require('../transform')

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

// A clip, a border and a shadow are composition objects in absolute pixels on
// Windows, so what paints has to be told the box as well as the style, which
// is what `resize` is for. A primitive whose content always spills, such as a
// picture that fills its box, is clipped whatever its style says.
module.exports = exports = class WindowsPaint {
  constructor(element, opts = {}) {
    const { clipped = false, panel = false } = opts

    this._element = element
    this._clipped = clipped

    // Whether the element can hold children of its own. A composition visual
    // laid over an element draws above everything the element holds, and CSS
    // paints a background and a border before the descendants that sit on top
    // of them, so both go on children of their own kept behind the rest. An
    // element with nowhere to put them paints through its own properties and
    // casts no shadow at all.
    this._panel = panel

    this._surface = null
    this._shade = null

    this._width = 0
    this._height = 0
    this._radius = 0
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

  // The canvas the background and the border are drawn into, and the one the
  // shadow is drawn into behind it. A panel draws its own background below
  // every child it has, so a lower index is all that orders these.
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

          // A panel fills its own background, so what stays on the element is
          // a colour that draws nothing and still answers a hit test, which
          // is what a null brush would not.
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
        case 'borderWidth':
          this._borderWidth = value
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

  // A panel rounds its own background, so only a box that hides what leaves it
  // is clipped. An element that paints through its own properties has no other
  // way to round one, and clips whatever its overflow says.
  _reclip() {
    const rounded = this._radius > 0 && !this._panel

    if (this._clipped || this._overflow === 'hidden' || rounded) {
      if (this._clip === null) {
        this._clip = this.visual.compositor.createRoundedRectangleGeometry()
        this.visual.clip = this.visual.compositor.createGeometricClip(this._clip)
      }

      this._clip.size = { x: this._width, y: this._height }
      this._clip.cornerRadius = { x: this._radius, y: this._radius }
    } else if (this._clip !== null) {
      this.visual.clip = null
      this._clip = null
    }
  }

  _repaint() {
    const width = this._width
    const height = this._height
    const radius = this._radius
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

    visual.size = { x: width, y: height }

    background.brush.color = filled ? bytes(this._backgroundColor) : TRANSPARENT
    background.geometry.size = { x: width, y: height }
    background.geometry.cornerRadius = { x: radius, y: radius }

    border.brush.color = stroked ? bytes(this._borderColor) : TRANSPARENT
    border.shape.strokeThickness = thickness
    border.geometry.offset = { x: inset, y: inset }
    border.geometry.size = { x: Math.max(0, width - thickness), y: Math.max(0, height - thickness) }
    border.geometry.cornerRadius = {
      x: Math.max(0, radius - inset),
      y: Math.max(0, radius - inset)
    }
  }

  // A drop shadow takes the shape it casts from a mask rather than from what
  // the visual carrying it draws, so the box is drawn once more as a filled
  // rounded rectangle and handed over as a surface. The visual itself paints
  // nothing.
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
    geometry.size = { x: width, y: height }
    geometry.cornerRadius = { x: this._radius, y: this._radius }
    surface.sourceSize = { x: width, y: height }

    shadow.color = bytes(this._shadowColor)
    shadow.opacity = this._shadowOpacity
    shadow.offset = { x, y, z: 0 }

    // Composition blurs over the whole radius where Core Animation takes it as
    // the deviation the blur is drawn with, which is half as far.
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
    const geometry = compositor.createRoundedRectangleGeometry()

    return {
      geometry,
      shape: compositor.createSpriteShape(geometry),
      brush: compositor.createColorBrush()
    }
  }

  _createShadow() {
    const compositor = this.visual.compositor

    const geometry = compositor.createRoundedRectangleGeometry()
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

// A transform is a composition property rather than a XAML one, so a primitive
// that draws its own border through the control it holds comes here for this
// and nothing else. A visual has a centre point, but it is what the rotation
// and scale properties turn about rather than what the matrix does, so the
// origin is folded into the matrix.
exports.transform = function transform(element, { transform: matrix, transformOrigin: origin }) {
  WinUIElementCompositionPreview.getElementVisual(element).transformMatrix =
    matrix === null ? IDENTITY : around(matrix, origin)
}
