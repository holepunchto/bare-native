const { constants } = require('bare-yoga')

const NativeNode = require('./node')
const style = require('./style')

function factor(mode, natural, width, height) {
  if (mode === 'center') return 1

  const across = width / natural.width
  const down = height / natural.height

  return mode === 'cover' ? Math.max(across, down) : Math.min(across, down)
}

function constrain(mode, available, natural) {
  if (mode === constants.MEASURE_MODE.EXACTLY) return available
  if (mode === constants.MEASURE_MODE.AT_MOST && available < natural) return available

  return null
}

module.exports = exports = class NativeImageNode extends NativeNode {
  constructor() {
    super()

    this._source = null
    this._intrinsic = null
    this._mode = 'cover'
    this._box = { width: 0, height: 0 }

    this._layout.measure = this._onmeasure.bind(this)
  }

  get source() {
    return this._source
  }

  set source(value) {
    const source = value === undefined ? null : value

    if (source !== null && typeof source !== 'string') {
      throw new TypeError('An image source is the path of a file')
    }

    this._source = source

    const size = this._decode(source)

    // Platforms that decode asynchronously return undefined and report
    // through `_decoded` later.
    if (size !== undefined) this._settle(size, source)
  }

  // An abandoned decode still reports, so answers for a replaced source are
  // ignored.
  _decoded(size, source) {
    if (source !== this._source) return

    this._settle(size, source)
  }

  _settle(size, source) {
    this._intrinsic = size

    this._remeasure()

    this._fitted()

    if (source !== null) this._report(source)
  }

  // Reported on a later turn so that a listener attached right after setting
  // the source still hears it, as it must on platforms that decode later.
  _report(source) {
    queueMicrotask(() => {
      if (this.destroyed || this._source !== source) return

      if (this._intrinsic !== null) return this.emit('load', { ...this._intrinsic })

      // An unhandled `error` event throws, and an undecodable file is a state
      // rather than a fault, so it is only emitted when someone is listening.
      if (this.listenerCount('error') > 0) {
        this.emit('error', new Error(`Cannot read '${source}' as an image`))
      }
    })
  }

  get intrinsicSize() {
    return this._intrinsic === null ? null : { ...this._intrinsic }
  }

  get _paintable() {
    return style.IMAGE
  }

  get _container() {
    return false
  }

  // Like an `<img>`, an unconstrained axis follows the constrained one through
  // the intrinsic ratio.
  _onmeasure(width, widthMode, height, heightMode) {
    const natural = this._intrinsic

    if (natural === null) return { width: 0, height: 0 }

    const horizontal = constrain(widthMode, width, natural.width)
    const vertical = constrain(heightMode, height, natural.height)

    if (horizontal !== null && vertical !== null) {
      return { width: horizontal, height: vertical }
    }

    if (horizontal !== null) {
      return { width: horizontal, height: (horizontal * natural.height) / natural.width }
    }

    if (vertical !== null) {
      return { width: (vertical * natural.width) / natural.height, height: vertical }
    }

    return { width: natural.width, height: natural.height }
  }

  // Returns whether the mode changed, so the platform can redraw what it
  // already holds.
  _fit(properties) {
    if ('resizeMode' in properties === false) return false

    this._mode = style.fit(properties.resizeMode)

    return true
  }

  _resized(width, height) {
    this._box = { width, height }

    this._fitted()
  }

  // For platforms whose image view cannot place the picture itself.
  _placement() {
    const natural = this._intrinsic
    const { width, height } = this._box

    if (natural === null) return { x: 0, y: 0, width: 0, height: 0 }

    if (this._mode === 'stretch') return { x: 0, y: 0, width, height }

    const scale = factor(this._mode, natural, width, height)

    const scaled = { width: natural.width * scale, height: natural.height * scale }

    return { x: (width - scaled.width) / 2, y: (height - scaled.height) / 2, ...scaled }
  }

  // Called when the picture, mode or box changes, for platforms whose image
  // view cannot keep them in sync on its own.
  _fitted() {}

  // Returns the natural size, null for no source or an unreadable one, or
  // undefined if the platform will report through `_decoded` later.
  _decode(source) {
    throw new Error(`${this.constructor.name} does not implement _decode`)
  }
}
