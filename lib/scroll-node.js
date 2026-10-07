const { constants } = require('bare-yoga')

const NativeNode = require('./node')
const NativeView = require('#view')

const { FLEX_DIRECTION } = constants

// A scroll view is the one primitive whose tree is not bounded by its box: the
// content is laid out at its natural size and what falls outside is what there
// is to scroll. The content is a node of its own rather than the caller's, so
// appending to a scroll view means appending to the thing that scrolls.
module.exports = exports = class NativeScrollNode extends NativeNode {
  // Android scrolls one way per class, so the axis is settled when the view is
  // made rather than set on it afterwards.
  constructor(opts = {}) {
    super()

    const { horizontal = false } = opts

    this._horizontal = horizontal

    this._native = this._create(horizontal)

    // Yoga does not shrink a flex item unless told to, so a viewport given
    // `flexGrow` alone is sized by its content and there is nothing left to
    // scroll.
    this._layout.flexShrink = 1

    this._content = new NativeView()

    // The base implementation, because this class redirects the public one at
    // the content and this is the insertion that must not be redirected.
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

  // Both directions follow the axis. The viewport's decides which way its one
  // child is free to grow, so the content takes its natural size along the
  // axis and the viewport's size across it; the content's decides which way
  // what is inside it stacks.
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

  // Android stops at the end of its content and UIKit and AppKit take
  // whatever they are given, so what a caller means by scrolling past the end
  // is settled here rather than left to differ by platform. Nothing is asked
  // of the toolkits that they would not have been asked anyway.
  set contentOffset({ x = 0, y = 0 }) {
    const { width, height } = this._scrollable()

    this._scroll(bounded(x, width), bounded(y, height))
  }

  // What there is to scroll, which is how far the content overruns the box it
  // is seen through. A tree that has not been laid out overruns by nothing.
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

// Yoga reports a node that has not been laid out as `NaN` wide, which no
// comparison holds for.
function overrun(content, viewport) {
  const by = content - viewport

  return by > 0 ? by : 0
}

function bounded(value, max) {
  return value < 0 ? 0 : value > max ? max : value
}
