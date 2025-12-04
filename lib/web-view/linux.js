const EventEmitter = require('bare-events')
const WebKitGTK = require('bare-web-kit-gtk')

module.exports = class NativeWebView extends EventEmitter {
  constructor() {
    super()

    this._native = new WebKitGTK.WebView()

    this._native.visible = true
  }

  get native() {
    return this._native
  }

  loadURL(url) {
    this._native.loadURI(url)
    return this
  }

  loadHTML(html) {
    this._native.loadHTML(html)
    return this
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWebView }
    }
  }
}
