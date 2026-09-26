const { constants } = require('bare-yoga')

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

    this._numberOfLines = 0
    this._ellipsizeMode = 'tail'
  }

  // How many lines are drawn before the rest is cut, and how the cut is shown.
  // Zero is no limit, which is what every one of the five means by it.
  get numberOfLines() {
    return this._numberOfLines
  }

  set numberOfLines(value) {
    const lines = value === undefined ? 0 : value

    if (!Number.isInteger(lines) || lines < 0) {
      throw new TypeError(`Cannot read '${value}' as a number of lines`)
    }

    this._numberOfLines = lines

    this._truncated(lines, this._ellipsizeMode)
  }

  get ellipsizeMode() {
    return this._ellipsizeMode
  }

  // Cutting at the head or the middle is absent because WinUI has neither: a
  // `TextTrimming` is none, a clip, or an ellipsis at the end.
  set ellipsizeMode(value) {
    const mode = value === undefined ? 'tail' : value

    if (mode !== 'tail' && mode !== 'clip') {
      throw new TypeError(`Unknown value '${value}' for 'ellipsizeMode'`)
    }

    this._ellipsizeMode = mode

    this._truncated(this._numberOfLines, mode)
  }

  // The height a measurement comes to once the lines past the limit are not
  // drawn. Every platform but Windows measures the whole of the text and is
  // told the limit separately; Windows measures the element, which already
  // knows it.
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
  // Yoga insets a box's children by its padding and a text has none: what it
  // holds is a run the platform draws as a whole. So the padding is read back
  // off the pass that worked it out, and the platform insets the text by it.
  get _padding() {
    return {
      top: this._layout.getComputedPadding(constants.EDGE.TOP),
      right: this._layout.getComputedPadding(constants.EDGE.RIGHT),
      bottom: this._layout.getComputedPadding(constants.EDGE.BOTTOM),
      left: this._layout.getComputedPadding(constants.EDGE.LEFT)
    }
  }

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
