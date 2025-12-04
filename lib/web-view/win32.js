const EventEmitter = require('bare-events')
const WinUI = require('bare-win-ui')

module.exports = class NativeWebView extends EventEmitter {
  constructor() {
    super()

    this._native = new WinUI.WebView()
  }

  get native() {
    return this._native
  }

  loadURL(url) {
    this._native.navigate(url)
    return this
  }

  loadHTML(html) {
    this._native.navigateToString(html)
    return this
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWebView }
    }
  }
}
