const WinUI = require('bare-win-ui')

const NativeView = require('../view/win32')

const { Canvas } = WinUI

// A web view paints its own surface, so the styled box is a view of the usual
// kind and the web widget is the one thing inside it. Painting the widget
// directly would put the background and the border under the page rather than
// around it.
module.exports = class NativeWebView extends NativeView {
  constructor() {
    super()

    this._webView = new WinUI.WebView2()

    Canvas.setLeft(this._webView, 0)
    Canvas.setTop(this._webView, 0)

    this._native.children.insertAt(0, this._webView)
  }

  get _container() {
    return false
  }

  _resized(width, height) {
    super._resized(width, height)

    this._webView.width = width
    this._webView.height = height
  }

  loadURL(url) {
    this._webView.navigate(url)
    return this
  }

  loadHTML(html) {
    this._webView.navigateToString(html)
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
