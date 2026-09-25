const UIKit = require('bare-ui-kit')

const NativeImageNode = require('../image-node')
const Paint = require('../paint/apple')

const { CONTENT_MODE } = UIKit.View

const MODES = {
  cover: CONTENT_MODE.SCALE_ASPECT_FILL,
  contain: CONTENT_MODE.SCALE_ASPECT_FIT,
  stretch: CONTENT_MODE.SCALE_TO_FILL,
  center: CONTENT_MODE.CENTER
}

module.exports = class NativeImage extends NativeImageNode {
  constructor() {
    super()

    this._native = new UIKit.ImageView()

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
    const image = source === null ? null : UIKit.Image.withContentsOfFile(source)

    this._native.image = image

    return image === null ? null : image.size
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
