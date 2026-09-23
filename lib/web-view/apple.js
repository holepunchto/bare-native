const WebKit = require('bare-web-kit')
const { Layer } = require('bare-core-animation')

const NativeNode = require('../node')
const style = require('../style')

const TRANSPARENT = style.color('#0000')

module.exports = class NativeWebView extends NativeNode {
  constructor() {
    super()

    this._native = new WebKit.WebView()
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

  loadURL(url) {
    this._native.loadRequest(url)
    return this
  }

  loadHTML(html) {
    this._native.loadHTMLString(html)
    return this
  }

  inspectable(enabled) {
    this._native.inspectable = enabled
    return this
  }

  get _container() {
    return false
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
      __proto__: { constructor: NativeWebView }
    }
  }
}
