const NativeNode = require('./node')

// A page is loaded from a URL or from markup, and whichever was given last is
// what the view shows, so giving one forgets the other.
module.exports = exports = class NativeWebViewNode extends NativeNode {
  constructor() {
    super()

    this._url = null
    this._html = null
    this._inspectable = false
  }

  get _container() {
    return false
  }

  get url() {
    return this._url
  }

  set url(value) {
    const url = value === undefined ? null : value

    if (url !== null && typeof url !== 'string') throw new TypeError('A URL is a string')

    this._url = url

    if (url === null) return

    this._html = null

    this._loadURL(url)
  }

  get html() {
    return this._html
  }

  set html(value) {
    const html = value === undefined ? null : value

    if (html !== null && typeof html !== 'string') throw new TypeError('HTML is a string')

    this._html = html

    if (html === null) return

    this._url = null

    this._loadHTML(html)
  }

  get inspectable() {
    return this._inspectable
  }

  set inspectable(value) {
    const inspectable = value === true

    if (this._inspectable === inspectable) return

    this._inspectable = inspectable

    this._inspect(inspectable)
  }

  _loadURL(url) {}

  _loadHTML(html) {}

  _inspect(inspectable) {}
}
