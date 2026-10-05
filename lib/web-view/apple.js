const WebKitWebView = require('bare-web-kit/web-view')

const NativeWebViewNode = require('../web-view-node')
const Paint = require('../paint/apple')

module.exports = class NativeWebView extends NativeWebViewNode {
  constructor() {
    super()

    this._native = new WebKitWebView()

    this._painter = new Paint(this._native)
  }

  _loadURL(url) {
    this._native.loadRequest(url)
  }

  _loadHTML(html) {
    this._native.loadHTMLString(html)
  }

  _inspect(enabled) {
    this._native.inspectable = enabled
  }

  // A border is a layer of its own beneath the content, so what paints has to
  // be told the box it is drawing.
  _resized(width, height) {
    this._painter.resize(width, height)
  }

  _untransform() {
    this._painter.untransform()
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
