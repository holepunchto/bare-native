const { constants } = require('bare-yoga')

const NativeNode = require('./node')
const TextFragment = require('./text-fragment')
const style = require('./style')

module.exports = exports = class NativeTextNode extends NativeNode {
  constructor(text = '') {
    super()

    this._content = new TextFragment(text)
    this._content._owner = this

    this._own = {}

    this._numberOfLines = 0
    this._ellipsizeMode = 'tail'
  }

  get numberOfLines() {
    return this._numberOfLines
  }

  set numberOfLines(value) {
    const lines = value === undefined || value === null ? 0 : value

    if (!Number.isInteger(lines) || lines < 0) {
      throw new TypeError(`Cannot read '${value}' as a number of lines`)
    }

    this._numberOfLines = lines

    this._truncated(lines, this._ellipsizeMode)
  }

  get ellipsizeMode() {
    return this._ellipsizeMode
  }

  // WinUI only trims at the end, so head and middle modes are not offered.
  set ellipsizeMode(value) {
    const mode = value === undefined || value === null ? 'tail' : value

    if (mode !== 'tail' && mode !== 'clip') {
      throw new TypeError(`Unknown value '${value}' for 'ellipsizeMode'`)
    }

    this._ellipsizeMode = mode

    this._truncated(this._numberOfLines, mode)
  }

  // Every platform but Windows measures the whole text, so the height is capped
  // here. Windows measures an element that already applies the limit.
  _capped(lines, height) {
    if (this._numberOfLines === 0 || lines <= this._numberOfLines) return height

    return (height / lines) * this._numberOfLines
  }

  _truncated(lines, mode) {
    throw new Error(`${this.constructor.name} does not implement _truncated`)
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

  get _mixed() {
    return this._content._children.length > 0
  }

  get _runs() {
    return this._content._runs(this._own, [])
  }

  // Yoga applies padding to children and a text has none, so the platform insets
  // the text by the computed padding instead.
  get _padding() {
    return {
      top: this._layout.layoutPadding(constants.EDGE.TOP),
      right: this._layout.layoutPadding(constants.EDGE.RIGHT),
      bottom: this._layout.layoutPadding(constants.EDGE.BOTTOM),
      left: this._layout.layoutPadding(constants.EDGE.LEFT)
    }
  }

  // CSS adds letter spacing after every character, including the last. Pango,
  // WinUI and Android only space the gaps, so they come up one space short per
  // run.
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

  _inherit(properties) {
    return style.inherit(this._own, properties)
  }
}
