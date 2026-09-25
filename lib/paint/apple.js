const { Layer } = require('bare-core-animation')

const style = require('../style')

const TRANSPARENT = style.color('#0000')

// Every Apple primitive paints through the layer of the view it holds, so what
// the six properties mean is written once rather than once per primitive.
module.exports = exports = class ApplePaint {
  constructor(view) {
    this._view = view
    this._layer = null
  }

  // The layer is made on the first ask rather than with the view, because a
  // view nobody styles need not be backed by one.
  get layer() {
    if (this._layer === null) {
      this._layer = Layer.of(this._view)

      // A layer starts with an opaque black border, where the style model's
      // default is a transparent one, so a width on its own draws nothing here
      // as it draws nothing on the other platforms.
      this._layer.borderColor = TRANSPARENT
    }

    return this._layer
  }

  apply(properties) {
    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'backgroundColor':
          this.layer.backgroundColor = style.color(value)
          break
        case 'borderColor':
          this.layer.borderColor = style.color(value)
          break
        case 'borderRadius':
          this.layer.cornerRadius = value
          break
        case 'borderWidth':
          this.layer.borderWidth = value
          break
        case 'opacity':
          this.layer.opacity = value
          break
        case 'overflow':
          this.layer.masksToBounds = value === 'hidden'
          break
      }
    }
  }
}
