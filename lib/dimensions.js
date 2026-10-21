const EventEmitter = require('bare-events')

const platform = require('#dimensions')

const DIMENSIONS = new Set(['window', 'screen'])

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
