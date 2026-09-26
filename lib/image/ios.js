const UIKitImage = require('bare-ui-kit/image')
const UIKitImageView = require('bare-ui-kit/image-view')
const UIKitView = require('bare-ui-kit/view')

const NativeImageNode = require('../image-node')
const Paint = require('../paint/apple')

const { CONTENT_MODE } = UIKitView

const MODES = {
  cover: CONTENT_MODE.SCALE_ASPECT_FILL,
  contain: CONTENT_MODE.SCALE_ASPECT_FIT,
  stretch: CONTENT_MODE.SCALE_TO_FILL,
  center: CONTENT_MODE.CENTER
}

module.exports = class NativeImage extends NativeImageNode {
  constructor() {
    super()

    this._native = new UIKitImageView()

    this._painter = new Paint(this._native)

    this._native.contentMode = MODES.cover

    // A `UIView` draws outside its bounds unless it is told not to, and both
    // filling the box and centring at the natural size put a picture there.
    this._native.clipsToBounds = true
  }

  get layer() {
    return this._painter.layer
  }

  _decode(source) {
    const image = source === null ? null : UIKitImage.withContentsOfFile(source)

    this._native.image = image

    return image === null ? null : image.size
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

    if (this._fit(properties)) this._native.contentMode = MODES[this._mode]
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
