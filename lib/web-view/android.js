const NDKWebView = require('bare-ndk/web-view')

const NativeView = require('../view/android')
const { px } = require('../metrics/android')

// A web view paints its own surface, so the styled box is an ordinary view and
// the widget sits inside it rather than being painted itself.
module.exports = class NativeWebView extends NativeView {
  constructor() {
    super()

    this._webView = new NDKWebView()

    this._webView.settings.javaScriptEnabled = true

    this._native.addView(this._webView)
  }

  get _container() {
    return false
  }

  _resized(width, height) {
    this._native.setFrame(this._webView, 0, 0, px(width), px(height))
  }

  loadURL(url) {
    this._webView.loadURL(url)
    return this
  }

  loadHTML(html) {
    this._webView.loadData(html)
    return this
  }

  inspectable(enabled) {
    NDKWebView.debuggingEnabled(enabled)
    return this
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWebView }
    }
  }
}
