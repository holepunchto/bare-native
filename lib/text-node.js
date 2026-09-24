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

  // Takes the run properties out of a paint. They are the ones a fragment can
  // carry too, and the ones every run inherits when it carries none of its
  // own, so the platform reads them from here rather than keeping its own.
  // Reports whether any changed, because the text is built again if so.
  _inherit(properties) {
    let changed = false

    for (const name in properties) {
      if (!style.RUN.has(name)) continue

      this._own[name] = properties[name]
      changed = true
    }

    return changed
  }
}
