const WinUICanvas = require('bare-win-ui/canvas')
const WinUIWebView2 = require('bare-win-ui/web-view2')

const NativeNode = require('../node')
const Paint = require('../paint/win32')

// A web view paints its own surface, so the styled box is an ordinary view and
// the widget sits inside it rather than being painted itself.
module.exports = class NativeWebView extends NativeNode {
  constructor() {
    super()

    this._native = new WinUICanvas()

    this._painter = new Paint(this._native, { panel: true })

    this._webView = new WinUIWebView2()

    WinUICanvas.setLeft(this._webView, 0)
    WinUICanvas.setTop(this._webView, 0)

    this._native.children.insertAt(0, this._webView)
  }

  get _container() {
    return false
  }

  _resized(width, height) {
    this._painter.resize(width, height)

    this._webView.width = width
    this._webView.height = height
  }

  _paint(properties) {
    this._painter.apply(properties)
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
