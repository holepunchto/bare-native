const NativeNode = require('./node')
const style = require('./style')

const SIZES = new Set(['small', 'large'])

module.exports = exports = class NativeActivityIndicatorNode extends NativeNode {
  constructor() {
    super()

    this._animating = true
    this._size = 'small'

    this._layout.measure = this._onmeasure.bind(this)
  }

  get _container() {
    return false
  }

  get _paintable() {
    return style.INDICATOR
  }

  get animating() {
    return this._animating
  }

  set animating(value) {
    const animating = value !== false

    if (this._animating === animating) return

    this._animating = animating

    this._animate(animating)
  }

  get size() {
    return this._size
  }

  set size(value) {
    const size = value === undefined || value === null ? 'small' : value

    if (!SIZES.has(size)) {
      throw new TypeError(`Unknown value '${size}' for 'size'`)
    }

    if (this._size === size) return

    this._size = size

    this._sized(size)

    this._remeasure()
  }

  _onmeasure(width, widthMode, height, heightMode) {
    return this._natural()
  }

  _natural() {
    throw new Error(`${this.constructor.name} does not implement _natural`)
  }

  _animate(animating) {}

  _sized(size) {}
}
