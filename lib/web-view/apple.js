const WebKit = require('bare-web-kit')

const NativeNode = require('../node')
const Paint = require('../paint/apple')

module.exports = class NativeWebView extends NativeNode {
  constructor() {
    super()

    this._native = new WebKit.WebView()

    this._painter = new Paint(this._native)
  }

  get layer() {
    return this._painter.layer
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
    this._painter.apply(properties)
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
