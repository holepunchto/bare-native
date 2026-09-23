const EventEmitter = require('bare-events')

const platform = require('#keyboard')

// How much of the window a software keyboard is covering, which is what the
// tree is already laid out around as `env(keyboard-inset-height)`. React
// Native's name, and the one question that means the same on all five: three
// of them have no software keyboard and answer nothing is covered.
//
// This is the one of these that does not need a window to answer, because
// nothing covered is a true answer rather than an absent one.
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

  // Asks whoever is editing to stop, which is what puts the keyboard away
  // without this layer knowing which field raised it.
  dismiss() {
    if (this._window !== null) platform.dismiss(this._window)
  }

  _attach(window) {
    this._window = window
  }

  // Said by the window, because the window is what hears the keyboard move
  // and what has to lay the tree out around it either way. Android reports
  // every inset together, so most of what arrives here is the system bars
  // rather than the keyboard, and only a height that moved is a change.
  _changed() {
    const height = this.height

    if (height === this._delivered) return

    this._delivered = height

    this.emit('change', { height })
  }
}

module.exports = exports = new NativeKeyboard()
