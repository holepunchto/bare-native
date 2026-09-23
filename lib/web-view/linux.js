const WebKitGTK = require('bare-web-kit-gtk')

const NativeView = require('../view/linux')

// A web view paints its own surface, so the styled box is a view of the usual
// kind and the web widget is the one thing inside it. Painting the widget
// directly would put the background and the border under the page rather than
// around it.
module.exports = class NativeWebView extends NativeView {
  constructor() {
    super()

    this._webView = new WebKitGTK.WebView()
    this._webView.visible = true
    this._webView.insertBefore(this._native, null)

    this._webViewChild = this._manager.getLayoutChild(this._webView)
  }

  get _container() {
    return false
  }

  _resized(width, height) {
    this._webViewChild.frame = [0, 0, width, height]
  }

  _destroy() {
    this._webView.unparent()

    super._destroy()
  }

  loadURL(url) {
    this._webView.loadURI(url)
    return this
  }

  loadHTML(html) {
    this._webView.loadHTML(html)
    return this
  }

  inspectable(enabled) {
    return this
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWebView }
    }
  }
}
