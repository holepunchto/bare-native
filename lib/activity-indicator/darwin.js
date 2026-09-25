const AppKit = require('bare-app-kit')

const NativeActivityIndicatorNode = require('../activity-indicator-node')
const Paint = require('../paint/apple')

const { Control, ProgressIndicator } = AppKit

// AppKit draws four control sizes and React Native names two of them.
const SIZES = {
  small: Control.SIZE.SMALL,
  large: Control.SIZE.REGULAR
}

module.exports = class NativeActivityIndicator extends NativeActivityIndicatorNode {
  constructor() {
    super()

    this._native = new ProgressIndicator({ x: 0, y: 0, width: 0, height: 0 })

    this._native.wantsLayer = true

    // One indicator draws both a bar and a spinner here, so which of the two
    // it is is a property rather than a class.
    this._native.style = ProgressIndicator.STYLE.SPINNING
    this._native.indeterminate = true
    this._native.controlSize = SIZES.small

    // An indicator that is not animating shows nothing, which is what UIKit
    // does of its own accord and React Native does on every platform.
    this._native.displayedWhenStopped = false

    this._painter = new Paint(this._native)

    this._native.startAnimation()
  }

  get layer() {
    return this._painter.layer
  }

  _natural() {
    const { width, height } = this._native.fittingSize

    return { width, height }
  }

  _animate(animating) {
    if (animating) this._native.startAnimation()
    else this._native.stopAnimation()
  }

  _sized(size) {
    this._native.controlSize = SIZES[size]
  }

  // A spinner is drawn in the system's own accent colour, which AppKit alone
  // offers nothing to change.
  _paint(properties) {
    this._painter.apply(properties)
  }

  _destroy() {
    this._native.removeFromSuperview()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeActivityIndicator }
    }
  }
}
