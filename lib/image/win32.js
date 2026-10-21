const WinUIBitmapImage = require('bare-win-ui/bitmap-image')
const WinUICanvas = require('bare-win-ui/canvas')
const WinUIImage = require('bare-win-ui/image')
const { pathToFileURL } = require('bare-url')

const NativeImageNode = require('../image-node')
const Paint = require('../paint/win32')

const STRETCHES = {
  cover: WinUIImage.STRETCH.UNIFORM_TO_FILL,
  contain: WinUIImage.STRETCH.UNIFORM,
  stretch: WinUIImage.STRETCH.FILL,
  center: WinUIImage.STRETCH.NONE
}

// An `Image` has no background, border or corner radius, so it sits in a
// canvas that carries those.
module.exports = class NativeImage extends NativeImageNode {
  constructor() {
    super()

    this._native = new WinUICanvas()

    this._image = new WinUIImage()

    this._image.stretch = STRETCHES.cover

    this._native.children.insertAt(0, this._image)

    this._bitmap = null

    this._painter = new Paint(this._native, { clipped: true, panel: true })
  }

  // A `BitmapImage` decodes asynchronously and reports through its own events.
  // The element's events are not used as they also fire for replaced bitmaps.
  _decode(source) {
    if (source === null) {
      this._bitmap = null
      this._image.source = null

      return null
    }

    const bitmap = new WinUIBitmapImage()

    bitmap.on('imageOpened', () => this._onopened(bitmap, source))
    bitmap.on('imageFailed', () => this._decoded(null, source))

    this._bitmap = bitmap

    this._image.source = bitmap

    // Setting the URI starts the decode, so the bitmap is attached first.
    bitmap.uriSource = pathToFileURL(source).href

    return undefined
  }

  _onopened(bitmap, source) {
    this._decoded({ width: bitmap.pixelWidth, height: bitmap.pixelHeight }, source)
  }

  _resized(width, height) {
    super._resized(width, height)

    this._painter.resize(width, height)
  }

  // `None` draws at the element's top left rather than its centre, and an
  // element in a canvas cannot be aligned, so it is sized and placed explicitly.
  _fitted() {
    const { x, y, width, height } =
      this._mode === 'center' ? this._placement() : { x: 0, y: 0, ...this._box }

    WinUICanvas.setLeft(this._image, x)
    WinUICanvas.setTop(this._image, y)

    this._image.width = width
    this._image.height = height
  }

  _paint(properties) {
    this._painter.apply(properties)

    if (this._fit(properties)) {
      this._image.stretch = STRETCHES[this._mode]

      this._fitted()
    }
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeImage }
    }
  }
}
