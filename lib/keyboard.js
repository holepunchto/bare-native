const EventEmitter = require('bare-events')

const platform = require('#keyboard')

// Unlike its siblings, this needs no window, as nothing covered is a valid answer.
class NativeKeyboard extends EventEmitter {
  constructor() {
    super()

    this._window = null
    this._delivered = 0
  }

  get height() {
    return this._window === null ? 0 : this._window.keyboard
  }

  isVisible() {
    return this.height > 0
  }

  dismiss() {
    if (this._window !== null) platform.dismiss(this._window)
  }

  _attach(window) {
    this._window = window
  }

  // Android reports every inset together, so most calls are for the system bars.
  _changed() {
    const height = this.height

    if (height === this._delivered) return

    this._delivered = height

    this.emit('change', { height })
  }
}

module.exports = exports = new NativeKeyboard()
