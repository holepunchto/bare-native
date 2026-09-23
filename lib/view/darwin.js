const AppKit = require('bare-app-kit')
const { Layer } = require('bare-core-animation')

const NativeNode = require('../node')
const style = require('../style')

module.exports = class NativeView extends NativeNode {
  constructor() {
    super()

    this._native = new AppKit.View()

    // Yoga measures from the top left, which is what a flipped view uses, so
    // computed frames go across without conversion.
    this._native.flipped = true
    this._native.wantsLayer = true

    this._backing = null
  }

  get layer() {
    if (this._backing === null) this._backing = Layer.of(this._native)

    return this._backing
  }

  _insert(child, index) {
    const next = this._children[index]

    if (next === undefined) this._native.addSubview(child._native)
    else {
      this._native.addSubview(child._native, AppKit.View.ORDERING.BELOW, next._native)
    }
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
