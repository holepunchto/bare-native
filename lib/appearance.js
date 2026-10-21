const EventEmitter = require('bare-events')

const platform = require('#appearance')

const SCHEMES = new Set(['light', 'dark'])

class NativeAppearance extends EventEmitter {
  constructor() {
    super()

    this._window = null
    this._listening = false
    this._watching = false

    this.on('newListener', (name) => {
      if (name !== 'change') return

      this._listening = true

      this._start()
    })
  }

  getColorScheme() {
    return platform.read(this._attached())
  }

  setColorScheme(colorScheme) {
    if (colorScheme !== null && colorScheme !== undefined && !SCHEMES.has(colorScheme)) {
      throw new TypeError(`Unknown value '${colorScheme}' for a colour scheme`)
    }

    platform.write(this._attached(), colorScheme === undefined ? null : colorScheme)
  }

  _attached() {
    if (this._window === null) {
      throw new Error('A colour scheme belongs to a window, and none has content yet')
    }

    return this._window
  }

  // Watching waits for a listener too, as some platforms must create an observer to hear changes.
  _attach(window) {
    this._window = window

    this._start()
  }

  _start() {
    if (this._watching || !this._listening || this._window === null) return

    this._watching = true

    platform.watch(this._window, (colorScheme) => this.emit('change', colorScheme))
  }
}

module.exports = exports = new NativeAppearance()
