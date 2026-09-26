const NDKBitmapFactory = require('bare-ndk/bitmap-factory')
const NDKDisplayMetrics = require('bare-ndk/display-metrics')
const NDKImageView = require('bare-ndk/image-view')

const NativeImageNode = require('../image-node')
const Paint = require('../paint/android')

const { SCALE_TYPE } = NDKImageView

const SCALE_TYPES = {
  cover: SCALE_TYPE.CENTER_CROP,
  contain: SCALE_TYPE.FIT_CENTER,
  stretch: SCALE_TYPE.FIT_XY,
  center: SCALE_TYPE.CENTER
}

module.exports = class NativeImage extends NativeImageNode {
  constructor() {
    super()

    this._native = new NDKImageView()

    this._painter = new Paint(this._native)

    this._native.scaleType = SCALE_TYPES.cover
  }

  _decode(source) {
    const bitmap = source === null ? null : NDKBitmapFactory.decodeFile(source)

    if (bitmap === null) {
      this._native.setImageBitmap(null)

      return null
    }

    // A bitmap decoded from a file is given the screen's density, which reads
    // the picture as already being in device pixels and makes the same file a
    // different size on every phone. `NSImage` and `UIImage` read a plain file
    // at a scale of one, so this one is told it is drawn at one too, and the
    // view scales it from there. It has to be said before the bitmap is
    // handed over, because the drawable works its size out as it takes it.
    bitmap.density = NDKDisplayMetrics.DENSITY_DEFAULT

    this._native.setImageBitmap(bitmap)

    // A picture drawn at a scale of one measures its own pixels in density
    // independent ones, which is what the other platforms report as well.
    return { width: bitmap.width, height: bitmap.height }
  }

  _paint(properties) {
    this._painter.apply(properties)

    if (this._fit(properties)) this._native.scaleType = SCALE_TYPES[this._mode]
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeImage }
    }
  }
}
