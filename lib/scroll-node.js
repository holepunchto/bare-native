const { constants } = require('bare-yoga')

const NativeNode = require('./node')
const NativeView = require('#view')

const { FLEX_DIRECTION } = constants

// The content is a node of its own, so children are appended to the box that
// scrolls.
module.exports = exports = class NativeScrollNode extends NativeNode {
  // Android scrolls one axis per class, so the axis is fixed at construction.
  constructor(opts = {}) {
    super()

    const { horizontal = false } = opts

    this._horizontal = horizontal

    this._native = this._create(horizontal)

    // Yoga does not shrink flex items by default, so the viewport would grow to
    // fit its content and nothing would scroll.
    this._layout.flexShrink = 1

    this._content = new NativeView()

    // The base implementation, as the public one is redirected to the content.
    NativeNode.prototype.insertChild.call(this, this._content, 0)

    this._direct()
  }

  get horizontal() {
    return this._horizontal
  }

  get content() {
    return this._content
  }

  get contentStyle() {
    return this._content.style
  }

  set contentStyle(value) {
    this._content.style = value

    const flat = this._content.style

    if (flat === undefined || 'flexDirection' in flat === false) this._direct()
  }

  _direct() {
    const direction = this._horizontal ? FLEX_DIRECTION.ROW : FLEX_DIRECTION.COLUMN

    this._layout.flexDirection = direction
    this._content._layout.flexDirection = direction
  }

  get style() {
    return super.style
  }

  set style(value) {
    super.style = value

    this._layout.flexShrink = 1

    this._direct()
  }

  get children() {
    return this._content.children
  }

  appendChild(child) {
    return this._content.appendChild(child)
  }

  insertChild(child, index) {
    return this._content.insertChild(child, index)
  }

  insertBefore(child, reference) {
    return this._content.insertBefore(child, reference)
  }

  removeChild(child) {
    return this._content.removeChild(child)
  }

  get contentOffset() {
    return this._scrolled()
  }

  // Clamped here, as Android stops at the end of its content while UIKit and
  // AppKit accept any offset.
  set contentOffset({ x = 0, y = 0 }) {
    const { width, height } = this._scrollable()

    this._scroll(bounded(x, width), bounded(y, height))
  }

  _scrollable() {
    const viewport = this._layout.layout
    const content = this._content._layout.layout

    return {
      width: overrun(content.width, viewport.width),
      height: overrun(content.height, viewport.height)
    }
  }

  _create(horizontal) {
    throw new Error(`${this.constructor.name} does not implement _create`)
  }

  _scrolled() {
    throw new Error(`${this.constructor.name} does not implement _scrolled`)
  }

  _scroll(x, y) {
    throw new Error(`${this.constructor.name} does not implement _scroll`)
  }
}

// `NaN` before the first layout compares false and so yields zero.
function overrun(content, viewport) {
  const by = content - viewport

  return by > 0 ? by : 0
}

function bounded(value, max) {
  return value < 0 ? 0 : value > max ? max : value
}
