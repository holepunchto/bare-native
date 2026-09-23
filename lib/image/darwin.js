const AppKitColor = require('bare-app-kit/color')
const AppKitImage = require('bare-app-kit/image')
const AppKitImageView = require('bare-app-kit/image-view')

const NativeImageNode = require('../image-node')
const Paint = require('../paint/apple')
const style = require('../style')

const { IMAGE_ALIGNMENT, IMAGE_SCALING } = AppKitImageView

// `NSImageView` scales an image to fit its box and never to fill it, so
// covering is the one mode it has no scaling for. What it does have is a
// scaling that draws an image at the image's own size, which is where a
// covering picture states how big it has to be.
const SCALINGS = {
  cover: IMAGE_SCALING.NONE,
  contain: IMAGE_SCALING.PROPORTIONALLY_UP_OR_DOWN,
  stretch: IMAGE_SCALING.AXES_INDEPENDENTLY,
  center: IMAGE_SCALING.NONE
}

module.exports = class NativeImage extends NativeImageNode {
  constructor() {
    super()

    this._native = new AppKitImageView({ x: 0, y: 0, width: 0, height: 0 })

    this._native.wantsLayer = true
    this._native.imageScaling = SCALINGS.cover
    this._native.imageAlignment = IMAGE_ALIGNMENT.CENTER

    this._painter = new Paint(this._native)

    this._image = null
    this._tint = null

    // The picture is drawn to the edges of the box and no further, which is
    // what the other platforms' image views do without being asked.
    this.layer.masksToBounds = true
  }

  get layer() {
    return this._painter.layer
  }

  _decode(source) {
    const image = source === null ? null : AppKitImage.withContentsOfFile(source)

    if (image !== null) image.template = this._tint !== null

    this._image = image
    this._native.image = image

    return image === null ? null : image.size
  }

  // A covering image is given the size it has to be drawn at, because the view
  // does not scale it and the layer clips what falls outside. The view centres
  // it, so where the placement puts it is not needed here.
  _fitted() {
    if (this._image === null) return

    const { width, height } = this._placement()

    this._image.size = { width, height }

    this._native.needsDisplay = true
  }

  // A border is a layer of its own beneath the content, so what paints has to
  // be told the box it is drawing.
  _resized(width, height) {
    this._painter.resize(width, height)
  }

  _untransform() {
    this._painter.untransform()
  }

  // A picture is drawn in the view's content tint only where it is a template,
  // which is what AppKit calls an image carrying a shape rather than a
  // picture. The flag goes on with the tint and comes off with it.
  _tinted(tint) {
    this._tint = tint

    this._native.contentTintColor =
      tint === null ? null : AppKitColor.rgb(tint.red, tint.green, tint.blue, tint.alpha)

    if (this._image !== null) this._image.template = tint !== null

    this._native.needsDisplay = true
  }

  _paint(properties) {
    this._painter.apply(properties)

    if ('tintColor' in properties) this._tinted(style.color(properties.tintColor))

    if (this._fit(properties)) {
      this._native.imageScaling = SCALINGS[this._mode]

      this._fitted()
    }
  }

  _destroy() {
    this._native.removeFromSuperview()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeImage }
    }
  }
}
