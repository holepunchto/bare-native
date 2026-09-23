const EventEmitter = require('bare-events')

const platform = require('#appearance')

const SCHEMES = new Set(['light', 'dark'])

// Whether an application is drawn light or dark. React Native's vocabulary,
// and both halves of the web's: what is being drawn can be read, as
// `prefers-color-scheme` reads it, and what this application supports can be
// said, as `color-scheme` says it. Saying nothing means following the system,
// which is what every toolkit here does on its own.
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

  // Three of the five keep the scheme on the application and two on the tree
  // that is drawn, so what crosses is the one both can answer: the window, and
  // nothing to answer with until it has content.
  _attached() {
    if (this._window === null) {
      throw new Error('A colour scheme belongs to a window, and none has content yet')
    }

    return this._window
  }

  // Every one of the five reports a change through what it draws rather than
  // through an application object: a view on the Apple platforms, the root
  // element on Windows, the activity on Android and the display's settings on
  // GTK. So the window says when it has content to hang that on, and the hook
  // waits for a listener as well, because three of them have to make something
  // to hear it through.
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
