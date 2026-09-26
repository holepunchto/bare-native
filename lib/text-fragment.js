const style = require('./style')

// A run of text inside a text. A fragment is a range of what the platform
// draws rather than anything it can place: it has no box, so it has no layout
// node and no view, and it reaches a platform only as part of the text that
// owns it.
module.exports = exports = class TextFragment {
  constructor(text = '') {
    this._parent = null
    this._owner = null
    this._children = []
    this._text = text
    this._style = null
    this._hidden = false
  }

  get parent() {
    return this._parent
  }

  get children() {
    return this._children.slice()
  }

  get text() {
    return this._text
  }

  set text(value) {
    if (value === this._text) return

    this._text = value

    this._invalidate()
  }

  get style() {
    return this._style
  }

  set style(value) {
    for (const name in value) {
      if (style.RUN.has(name)) continue

      throw new TypeError(`Unknown style property '${name}' on a text fragment`)
    }

    this._style = value

    this._invalidate()
  }

  get hidden() {
    return this._hidden
  }

  set hidden(value) {
    if (value === this._hidden) return

    this._hidden = value

    this._invalidate()
  }

  appendChild(child) {
    this.insertChild(child, length(this, child))
  }

  insertChild(child, index) {
    if (child instanceof exports === false) {
      throw new TypeError(`${this.constructor.name} can only contain text`)
    }

    if (child === this) throw new Error('A node cannot contain itself')

    if (index < 0 || index > length(this, child)) {
      throw new RangeError(`Index ${index} is out of range`)
    }

    if (child._parent !== null) child._parent.removeChild(child)

    this._children.splice(index, 0, child)
    child._parent = this

    this._invalidate()
  }

  insertBefore(child, reference) {
    if (reference === null) return this.appendChild(child)

    if (!this._children.includes(reference)) {
      throw new Error('Reference is not a child of this node')
    }

    if (child === reference) return

    if (child._parent !== null) child._parent.removeChild(child)

    this.insertChild(child, this._children.indexOf(reference))
  }

  removeChild(child) {
    const index = this._children.indexOf(child)

    if (index === -1) return

    this._children.splice(index, 1)
    child._parent = null

    this._invalidate()
  }

  destroy() {
    while (this._children.length > 0) this._children[0].destroy()

    if (this._parent !== null) this._parent.removeChild(this)
  }

  // A run carries the whole of its style rather than a difference from the one
  // around it, because that is what every platform's attributed text takes.
  _runs(inherited, out) {
    if (this._hidden) return out

    const resolved = this._style === null ? inherited : { ...inherited, ...this._style }

    if (this._text !== '') {
      out.push({ text: style.casing(this._text, resolved.textTransform), style: resolved })
    }

    for (const child of this._children) child._runs(resolved, out)

    return out
  }

  _invalidate() {
    let fragment = this

    while (fragment._parent !== null) fragment = fragment._parent

    if (fragment._owner !== null) fragment._owner._apply()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: exports },
      text: this._text,
      style: this._style
    }
  }
}

function length(parent, child) {
  return parent._children.length - (child._parent === parent ? 1 : 0)
}
