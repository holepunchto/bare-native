const NDKBitmapFactory = require('bare-ndk/bitmap-factory')
const NDKDisplayMetrics = require('bare-ndk/display-metrics')
const NDKImageView = require('bare-ndk/image-view')

const NativeImageNode = require('../image-node')
const Paint = require('../paint/android')
const style = require('../style')

const { SCALE_TYPE } = NDKImageView

function argb(color) {
  const { red, green, blue, alpha } = color

  return (
    ((Math.round(alpha * 255) << 24) |
      (Math.round(red * 255) << 16) |
      (Math.round(green * 255) << 8) |
      Math.round(blue * 255)) >>
    0
  )
}

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

    // Decoded bitmaps take the screen density, making a file's size differ per
    // device. Use a density of one, as `NSImage` and `UIImage` do. This must be set
    // before the bitmap is handed over, as the drawable reads its size then.
    bitmap.density = NDKDisplayMetrics.DENSITY_DEFAULT

    this._native.setImageBitmap(bitmap)

    return { width: bitmap.width, height: bitmap.height }
  }

  _paint(properties) {
    this._painter.apply(properties)

    if ('tintColor' in properties) {
      const tint = style.color(properties.tintColor)

      this._native.imageTint = tint === null ? null : argb(tint)
    }

    if (this._fit(properties)) this._native.scaleType = SCALE_TYPES[this._mode]
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeImage }
    }
  }
}
