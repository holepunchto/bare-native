const AppKitControl = require('bare-app-kit/control')
const AppKitProgressIndicator = require('bare-app-kit/progress-indicator')

const NativeActivityIndicatorNode = require('../activity-indicator-node')
const Paint = require('../paint/apple')

const SIZES = {
  small: AppKitControl.SIZE.SMALL,
  large: AppKitControl.SIZE.REGULAR
}

module.exports = class NativeActivityIndicator extends NativeActivityIndicatorNode {
  constructor() {
    super()

    this._native = new AppKitProgressIndicator({ x: 0, y: 0, width: 0, height: 0 })

    this._native.wantsLayer = true

    this._native.style = AppKitProgressIndicator.STYLE.SPINNING
    this._native.indeterminate = true
    this._native.controlSize = SIZES.small

    // Hide a stopped indicator, as UIKit and React Native do.
    this._native.displayedWhenStopped = false

    this._painter = new Paint(this._native)

    this._native.startAnimation()
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

  // The border is a separate layer, so the painter needs the box size.
  _resized(width, height) {
    this._painter.resize(width, height)
  }

  _untransform() {
    this._painter.untransform()
  }

  // `color` is ignored here. An `NSProgressIndicator` is an `NSView` rather than
  // an `NSControl`, so AppKit offers no way to tint it.
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
