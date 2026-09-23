const UIKit = require('bare-ui-kit')
const { Layer } = require('bare-core-animation')

const NativeNode = require('../node')
const style = require('../style')

const TRANSPARENT = style.color('#0000')

module.exports = class NativeView extends NativeNode {
  constructor() {
    super()

    this._native = new UIKit.View()

    this._backing = null
  }

  get layer() {
    if (this._backing === null) {
      this._backing = Layer.of(this._native)

      // A layer starts with an opaque black border, where the style model's
      // default is a transparent one, so a width on its own draws nothing here
      // as it draws nothing on the other platforms.
      this._backing.borderColor = TRANSPARENT
    }

    return this._backing
  }

  _insert(child, index) {
    this._native.insertSubviewAtIndex(child._native, index)
  }

  _remove(child) {
    child._native.removeFromSuperview()
  }

  _place(child, x, y, width, height) {
    child._native.frame = { x, y, width, height }
  }

  _paint(properties) {
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

  _destroy() {
    this._native.removeFromSuperview()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeView }
    }
  }
}
