const EventEmitter = require('bare-events')
const NDK = require('bare-ndk')

NDK.WebView.debuggingEnabled(true)

module.exports = class NativeWebView extends EventEmitter {
  constructor() {
    super()

    this._native = new NDK.WebView()
  }

  get native() {
    return this._native
  }

  loadURL(url) {
    this._native.loadURL(url)
    return this
  }

  loadHTML(html) {
    this._native.loadData(html)
    return this
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWebView }
    }
  }
}
