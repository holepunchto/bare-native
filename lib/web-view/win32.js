const WinUICanvas = require('bare-win-ui/canvas')
const WinUIWebView2 = require('bare-win-ui/web-view2')

const NativeWebViewNode = require('../web-view-node')
const Paint = require('../paint/win32')

// A web view paints its own surface, so it sits inside an ordinary styled view.
module.exports = class NativeWebView extends NativeWebViewNode {
  constructor() {
    super()

    this._native = new WinUICanvas()

    this._painter = new Paint(this._native, { panel: true })

    this._webView = new WinUIWebView2()

    WinUICanvas.setLeft(this._webView, 0)
    WinUICanvas.setTop(this._webView, 0)

    this._native.children.insertAt(0, this._webView)

    // WebView2 enables dev tools by default, and its settings only exist once it
    // is ready.
    this._webView.ready().then(() => this._inspect(this._inspectable))
  }

  _resized(width, height) {
    this._painter.resize(width, height)

    this._webView.width = width
    this._webView.height = height
  }

  _paint(properties) {
    this._painter.apply(properties)
  }

  _loadURL(url) {
    this._webView.navigate(url)
  }

  _loadHTML(html) {
    this._webView.navigateToString(html)
  }

  _inspect(enabled) {
    const settings = this._webView.settings

    if (settings !== null) settings.areDevToolsEnabled = enabled
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWebView }
    }
  }
}
