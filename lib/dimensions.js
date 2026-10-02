const EventEmitter = require('bare-events')

const platform = require('#dimensions')

const DIMENSIONS = new Set(['window', 'screen'])

// How much room there is, in the same units a style is written in. React
// Native's vocabulary, and its two answers: the window is the room this tree
// has, which is the content area rather than the frame around it, and the
// screen is the display that window is on. The scale and the font scale
// belong to the display and are therefore the same in both.
class NativeDimensions extends EventEmitter {
  constructor() {
    super()

    this._window = null
    this._delivered = null
    this._listening = false

    this.on('newListener', (name) => {
      if (name !== 'change') return

      this._listening = true

      this._start()
    })
  }

  get(dimension) {
    if (!DIMENSIONS.has(dimension)) {
      throw new TypeError(`Unknown dimension '${dimension}'`)
    }

    return this._read()[dimension]
  }

  // A window's size is the one half of this no platform has to be asked for,
  // because the tree is already laid out in it.
  _read() {
    const window = this._attached()

    const { screen, scale, fontScale } = platform.read(window)
    const { width, height } = window.size

    return {
      window: { width, height, scale, fontScale },
      screen: { ...screen, scale, fontScale }
    }
  }

  _attached() {
    if (this._window === null) {
      throw new Error('Dimensions belong to a window, and none has content yet')
    }

    return this._window
  }

  _attach(window) {
    this._window = window

    this._start()
  }

  // A window resizing is what changes this on all five, and the display
  // changing under a window that keeps its size is what each platform has to
  // be asked about separately. Both arrive here, and neither is taken as a
  // change on its own: the same comparison `layout` makes, for the same
  // reason, since a handler for this one lays out as well.
  _start() {
    if (this._delivered !== null || !this._listening || this._window === null) return

    this._delivered = this._read()

    const changed = this._changed.bind(this)

    this._window.on('resize', changed)

    platform.watch(this._window, changed)
  }

  _changed() {
    const dimensions = this._read()

    if (same(dimensions, this._delivered)) return

    this._delivered = dimensions

    this.emit('change', dimensions)
  }
}

function same(a, b) {
  return (
    a.window.width === b.window.width &&
    a.window.height === b.window.height &&
    a.screen.width === b.screen.width &&
    a.screen.height === b.screen.height &&
    a.window.scale === b.window.scale &&
    a.window.fontScale === b.window.fontScale
  )
}

module.exports = exports = new NativeDimensions()
