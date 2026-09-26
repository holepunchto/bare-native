const AppKitImage = require('bare-app-kit/image')
const AppKitImageView = require('bare-app-kit/image-view')

const NativeImageNode = require('../image-node')
const Paint = require('../paint/apple')

const { ALIGNMENT, SCALING } = AppKitImageView

// `NSImageView` scales an image to fit its box and never to fill it, so
// covering is the one mode it has no scaling for. What it does have is a
// scaling that draws an image at the image's own size, which is where a
// covering picture states how big it has to be.
const SCALINGS = {
  cover: SCALING.NONE,
  contain: SCALING.PROPORTIONALLY_UP_OR_DOWN,
  stretch: SCALING.AXES_INDEPENDENTLY,
  center: SCALING.NONE
}

module.exports = class NativeImage extends NativeImageNode {
  constructor() {
    super()

    this._native = new AppKitImageView({ x: 0, y: 0, width: 0, height: 0 })

    this._native.wantsLayer = true
    this._native.imageScaling = SCALINGS.cover
    this._native.imageAlignment = ALIGNMENT.CENTER

    this._painter = new Paint(this._native)

    this._image = null

    // The picture is drawn to the edges of the box and no further, which is
    // what the other platforms' image views do without being asked.
    this.layer.masksToBounds = true
  }

  get layer() {
    return this._painter.layer
  }

  _decode(source) {
    const image = source === null ? null : AppKitImage.withContentsOfFile(source)

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

  _paint(properties) {
    this._painter.apply(properties)

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
