const WebKitGTKWebView = require('bare-web-kit-gtk/web-view')

const NativeView = require('../view/linux')

// A web view paints its own surface, so the styled box is an ordinary view and
// the widget sits inside it rather than being painted itself.
module.exports = class NativeWebView extends NativeView {
  constructor() {
    super()

    this._webView = new WebKitGTKWebView()
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
