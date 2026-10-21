const UIKitColor = require('bare-ui-kit/color')
const UIKitImage = require('bare-ui-kit/image')
const UIKitImageView = require('bare-ui-kit/image-view')
const UIKitView = require('bare-ui-kit/view')

const NativeImageNode = require('../image-node')
const Paint = require('../paint/apple')
const style = require('../style')

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

    this._image = null
    this._tint = null

    this._native.contentMode = MODES.cover

    this._native.clipsToBounds = true
  }

  _decode(source) {
    const image = source === null ? null : UIKitImage.withContentsOfFile(source)

    this._image = image
    this._native.image = this._rendered(image)

    return image === null ? null : image.size
  }

  _resized(width, height) {
    this._painter.resize(width, height)
  }

  _untransform() {
    this._painter.untransform()
  }

  // Tinting requires a separate template image, so the original is kept for
  // when the tint is removed.
  _rendered(image) {
    if (image === null || this._tint === null) return image

    return image.withRenderingMode(UIKitImage.RENDERING_MODE.ALWAYS_TEMPLATE)
  }

  _tinted(tint) {
    this._tint = tint

    this._native.tintColor =
      tint === null ? null : UIKitColor.rgb(tint.red, tint.green, tint.blue, tint.alpha)

    this._native.image = this._rendered(this._image)
  }

  _paint(properties) {
    this._painter.apply(properties)

    if ('tintColor' in properties) this._tinted(style.color(properties.tintColor))

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
