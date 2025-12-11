const EventEmitter = require('bare-events')
const WinUI = require('bare-win-ui')

module.exports = class NativeWindow extends EventEmitter {
  constructor(width, height) {
    super()

    this._native = new WinUI.Window()

    this._native.resize(width, height).activate()
  }

  get native() {
    return this._native
  }

  content(view) {
    this._native.content = view._native
    return this
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWindow }
    }
  }
}
