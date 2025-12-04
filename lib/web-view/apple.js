const EventEmitter = require('bare-events')
const WebKit = require('bare-web-kit')

module.exports = class NativeWebView extends EventEmitter {
  constructor() {
    super()

    this._native = new WebKit.WebView()
  }

  get native() {
    return this._native
  }

  loadURL(url) {
    this._native.loadRequest(url)
    return this
  }

  loadHTML(html, baseURL = 'about:blank') {
    this._native.loadHTMLString(html, baseURL)
    return this
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWebView }
    }
  }
}
