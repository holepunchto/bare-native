const { constants } = require('bare-yoga')

const NativeNode = require('./node')
const style = require('./style')

// How much a picture is scaled by to meet its box. Covering takes the larger
// of the two so that neither axis falls short, containing the smaller so that
// neither overflows, and centring leaves it alone.
function factor(mode, natural, width, height) {
  if (mode === 'center') return 1

  const across = width / natural.width
  const down = height / natural.height

  return mode === 'cover' ? Math.max(across, down) : Math.min(across, down)
}

// What the layout has settled about an axis: a size it insists on, a smaller
// one it will not exceed, or nothing at all.
function constrain(mode, available, natural) {
  if (mode === constants.MEASURE_MODE.EXACTLY) return available
  if (mode === constants.MEASURE_MODE.AT_MOST && available < natural) return available

  return null
}

// An image is a leaf that knows how big it wants to be, which is the one thing
// a layout cannot work out for itself. Decoding is the platform's, and what it
// hands back is that size; everything after it is the same on all five.
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

    // A platform that cannot decode where the source is set answers with
    // nothing at all, and says what it found through `_decoded` later.
    if (size !== undefined) this._settle(size, source)
  }

  // Told by such a platform what the picture turned out to be, and which
  // source it is answering about: a decode that was abandoned still reports,
  // and its answer must not be taken for the one that replaced it. The tree
  // has been laid out since, so a fresh answer asks for another pass, which is
  // the one thing an asynchronous decode costs above the platform files.
  _decoded(size, source) {
    if (source !== this._source) return

    this._settle(size, source)

    this._relayout()
  }

  _settle(size, source) {
    this._intrinsic = size

    this._layout.markDirty()

    this._fitted()

    if (source !== null) this._report(source)
  }

  // Reported a turn later rather than out of the setter, so that a listener
  // attached on the line after it still hears, and because the platform that
  // cannot decode where the source is set will have to report late anyway.
  // One shape on five platforms is worth the turn.
  _report(source) {
    queueMicrotask(() => {
      if (this.destroyed || this._source !== source) return

      if (this._intrinsic !== null) return this.emit('load', { ...this._intrinsic })

      // `error` is the one name an emitter treats as fatal when nothing is
      // listening, and a file that will not decode is a state rather than a
      // fault, so it is raised only for someone who asked to hear about it.
      if (this.listenerCount('error') > 0) {
        this.emit('error', new Error(`Cannot read '${source}' as an image`))
      }
    })
  }

  // What the picture measures before a layout has said anything, which is what
  // a caller reads to hold a box open for it.
  get intrinsicSize() {
    return this._intrinsic === null ? null : { ...this._intrinsic }
  }

  get _paintable() {
    return style.IMAGE
  }

  get _container() {
    return false
  }

  // An image is a replaced element: an axis the layout leaves open follows the
  // one it fixes, through the intrinsic ratio, which is what an `<img>` does
  // and what keeps a width on its own from squashing the picture.
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

  // Takes the mode out of a paint and reports whether it changed, because the
  // platform has to be told how to draw what it already holds. Named apart
  // from `_resized`, which is a node being told its own box.
  _fit(properties) {
    if ('resizeMode' in properties === false) return false

    this._mode = style.fit(properties.resizeMode)

    return true
  }

  _resized(width, height) {
    this._box = { width, height }

    this._fitted()
  }

  // Where the picture goes inside the box it was given. Three of the modes
  // centre a picture of some size in the box and the fourth is the box, so an
  // image view that cannot place a picture itself is told where to put it.
  _placement() {
    const natural = this._intrinsic
    const { width, height } = this._box

    if (natural === null) return { x: 0, y: 0, width: 0, height: 0 }

    if (this._mode === 'stretch') return { x: 0, y: 0, width, height }

    const scale = factor(this._mode, natural, width, height)

    const scaled = { width: natural.width * scale, height: natural.height * scale }

    return { x: (width - scaled.width) / 2, y: (height - scaled.height) / 2, ...scaled }
  }

  // Told whenever the picture, the mode or the box changed, for the platforms
  // whose image view cannot make the three agree on its own.
  _fitted() {}

  // Loads the file and reports the size it draws at, null for a source of null
  // and for one the platform cannot read, or nothing at all for a platform
  // that will answer through `_decoded` once it has decoded.
  _decode(source) {
    throw new Error(`${this.constructor.name} does not implement _decode`)
  }
}
