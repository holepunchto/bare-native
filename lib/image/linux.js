const GTKFrameFixed = require('bare-gtk/frame-fixed')
const GTKPicture = require('bare-gtk/picture')
const GTKTexture = require('bare-gtk/texture')
const { OVERFLOW_HIDDEN } = require('bare-gtk/constants')

const NativeImageNode = require('../image-node')
const Paint = require('../paint/linux')

// GTK 4.6 has no content fit on a `GtkPicture`, so the picture is allocated
// the box the mode asks for inside a container that clips the overflow.
module.exports = class NativeImage extends NativeImageNode {
  constructor() {
    super()

    this._native = new GTKFrameFixed()
    this._native.overflow = OVERFLOW_HIDDEN

    this._picture = new GTKPicture()

    this._picture.keepAspectRatio = false
    this._picture.canShrink = true

    this._picture.insertBefore(this._native, null)

    this._child = this._native.layoutManager.getLayoutChild(this._picture)

    this._painter = new Paint(this._native)
  }

  _decode(source) {
    let texture = null

    // GTK throws where the other platforms return null.
    if (source !== null) {
      try {
        texture = GTKTexture.newFromFilename(source)
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
