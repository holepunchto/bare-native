const WebKitWebView = require('bare-web-kit/web-view')

const NativeNode = require('../node')
const Paint = require('../paint/apple')

module.exports = class NativeWebView extends NativeNode {
  constructor() {
    super()

    this._native = new WebKitWebView()

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
