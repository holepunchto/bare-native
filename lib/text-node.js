const NativeNode = require('./node')
const TextFragment = require('./text-fragment')
const style = require('./style')

// Text is a leaf in the layout tree and a small tree of its own: what it holds
// are runs of one thing the platform lays out and draws as a whole, not boxes
// it could place. The root of that tree is a fragment like any other, so there
// is one place that holds a run and one that inherits a style.
module.exports = exports = class NativeTextNode extends NativeNode {
  constructor(text = '') {
    super()

    this._content = new TextFragment(text)
    this._content._owner = this

    this._own = {}
  }

  get text() {
    return this._content.text
  }

  set text(value) {
    this._content.text = value
  }

  get children() {
    return this._content.children
  }

  get _paintable() {
    return style.TEXT
  }

  get _container() {
    return false
  }

  // Whether the text is more than one run, which is the only case worth
  // building an attributed string for. A text with no fragments is the text it
  // has always been.
  get _mixed() {
    return this._content._children.length > 0
  }

  get _runs() {
    return this._content._runs(this._own, [])
  }

  // CSS puts the space between characters after every one of them, including
  // the last, so a run of eight characters is eight spaces wide and not seven.
  // Apple counts it that way already; Pango, WinUI and Android space only the
  // gaps, and what they leave out is one space per run.
  get _trailing() {
    let trailing = 0

    for (const run of this._runs) {
      const { letterSpacing } = run.style

      if (letterSpacing !== undefined) trailing += letterSpacing
    }

    return trailing
  }

  appendChild(child) {
    this._content.appendChild(child)
  }

  insertChild(child, index) {
    this._content.insertChild(child, index)
  }

  insertBefore(child, reference) {
    this._content.insertBefore(child, reference)
  }

  removeChild(child) {
    this._content.removeChild(child)
  }

  destroy() {
    this._content._owner = null
    this._content.destroy()

    super.destroy()
  }

  // The run properties a fragment can carry too, and the ones every run
  // inherits when it carries none of its own, so the platform reads them from
  // here rather than keeping its own.
  _inherit(properties) {
    return style.inherit(this._own, properties)
  }
}
