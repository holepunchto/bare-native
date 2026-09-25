const GTK = require('bare-gtk')

const NativeImageNode = require('../image-node')
const Paint = require('../paint/linux')

const { OVERFLOW_HIDDEN } = GTK.constants

// GTK 4.6 has no content fit on a `GtkPicture`: it fills what it is allocated,
// keeping the ratio or not. So the picture is allocated the box the mode asks
// for, inside a container that clips whatever falls outside, which is the same
// answer AppKit's missing scaling gets and uses only what 4.6 has.
module.exports = class NativeImage extends NativeImageNode {
  constructor() {
    super()

    this._native = new GTK.FrameFixed()
    this._native.overflow = OVERFLOW_HIDDEN

    this._picture = new GTK.Picture()

    // The allocation is the whole of what the picture is told, so it stretches
    // into it exactly rather than fitting itself inside it a second time.
    this._picture.keepAspectRatio = false
    this._picture.canShrink = true

    this._picture.insertBefore(this._native, null)

    this._child = this._native.layoutManager.getLayoutChild(this._picture)

    this._painter = new Paint(this._native)
  }

  _decode(source) {
    let texture = null

    // GTK raises where the other platforms answer with nothing, because that
    // is what a `GError` is. A file that will not decode is a state here.
    if (source !== null) {
      try {
        texture = GTK.Texture.newFromFilename(source)
      } catch {
        texture = null
      }
    }

    this._picture.paintable = texture

    return texture === null ? null : { width: texture.width, height: texture.height }
  }

  _fitted() {
    const { x, y, width, height } = this._placement()

    this._child.frame = [x, y, width, height]
  }

  _paint(properties) {
    this._painter.apply(properties)

    if (this._fit(properties)) this._fitted()
  }

  _destroy() {
    this._picture.unparent()

    this._painter.destroy()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeImage }
    }
  }
}
