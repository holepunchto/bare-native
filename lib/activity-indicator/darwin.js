const AppKitControl = require('bare-app-kit/control')
const AppKitProgressIndicator = require('bare-app-kit/progress-indicator')

const NativeActivityIndicatorNode = require('../activity-indicator-node')
const Paint = require('../paint/apple')

// AppKit draws four control sizes and React Native names two of them.
const SIZES = {
  small: AppKitControl.SIZE.SMALL,
  large: AppKitControl.SIZE.REGULAR
}

module.exports = class NativeActivityIndicator extends NativeActivityIndicatorNode {
  constructor() {
    super()

    this._native = new AppKitProgressIndicator({ x: 0, y: 0, width: 0, height: 0 })

    this._native.wantsLayer = true

    // One indicator draws both a bar and a spinner here, so which of the two
    // it is is a property rather than a class.
    this._native.style = AppKitProgressIndicator.STYLE.SPINNING
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
  // A border is a layer of its own beneath the content, so what paints has to
  // be told the box it is drawing.
  _resized(width, height) {
    this._painter.resize(width, height)
  }

  _untransform() {
    this._painter.untransform()
  }

  // `color` reaches here and stops. An `NSProgressIndicator` is an `NSView`
  // rather than an `NSControl`, so it has no content tint, and AppKit offers
  // no other way to say what colour to spin in: a spinner is drawn in the
  // appearance it is running in. The four other platforms take the colour, and
  // reaching `.native` is what is left for anyone who needs it here.
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
