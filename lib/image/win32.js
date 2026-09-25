const WinUI = require('bare-win-ui')
const { pathToFileURL } = require('bare-url')

const NativeImageNode = require('../image-node')
const Paint = require('../paint/win32')

const { Canvas, Image } = WinUI

const STRETCHES = {
  cover: Image.STRETCH.UNIFORM_TO_FILL,
  contain: Image.STRETCH.UNIFORM,
  stretch: Image.STRETCH.FILL,
  center: Image.STRETCH.NONE
}

// An `Image` has all four of the fits and none of the paint: a background, a
// border and a corner radius belong to a panel there. So the picture sits in a
// canvas that carries those, as a view's does, and fills it.
module.exports = class NativeImage extends NativeImageNode {
  constructor() {
    super()

    this._native = new Canvas()

    this._image = new Image()

    this._image.stretch = STRETCHES.cover

    this._native.children.insertAt(0, this._image)

    this._image.on('imageOpened', this._onopened.bind(this))
    this._image.on('imageFailed', this._onfailed.bind(this))

    this._bitmap = null
    this._decoding = null

    // A fit that fills the box and one that ignores it both put the picture
    // outside it, so this one clips whatever its style says.
    this._painter = new Paint(this._native, { clipped: true })
  }

  // A `BitmapImage` decodes off the thread that set it, so there is nothing to
  // report here and the element says what it found afterwards.
  _decode(source) {
    this._decoding = source

    if (source === null) {
      this._bitmap = null
      this._image.source = null

      return null
    }

    const bitmap = new WinUI.BitmapImage()

    this._bitmap = bitmap

    this._image.source = bitmap

    // Setting the source is what starts the decode, so the element is given
    // the picture before the picture is given the file. A `BitmapImage` takes
    // a URI where every other platform takes the path it already has.
    bitmap.uriSource = pathToFileURL(source).href

    return undefined
  }

  _onopened() {
    if (this._bitmap === null) return

    // A bitmap's pixels are its size in the layout, which is what a file with
    // nothing to say about its scale measures on the other four as well.
    this._decoded(
      { width: this._bitmap.pixelWidth, height: this._bitmap.pixelHeight },
      this._decoding
    )
  }

  _onfailed() {
    this._decoded(null, this._decoding)
  }

  _resized(width, height) {
    super._resized(width, height)

    this._painter.resize(width, height)
  }

  // Three of the fits work on an element the size of the box. `None` does not:
  // it draws the picture at the element's top left rather than its middle, and
  // an element in a canvas has no alignment to be given, so the one fit that
  // draws at a size of its own is given an element of that size instead.
  _fitted() {
    const { x, y, width, height } =
      this._mode === 'center' ? this._placement() : { x: 0, y: 0, ...this._box }

    Canvas.setLeft(this._image, x)
    Canvas.setTop(this._image, y)

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
