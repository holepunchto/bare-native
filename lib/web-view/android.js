const EventEmitter = require('bare-events')
const NDK = require('bare-ndk')

module.exports = class NativeWebView extends EventEmitter {
  constructor() {
    super()

    this._native = new NDK.WebView()

    this._native.javaScriptEnabled(true)
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

  inspectable(enabled) {
    NDK.WebView.debuggingEnabled(enabled)
    return this
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWebView }
    }
  }
}
