const EventEmitter = require('bare-events')
const AppKit = require('bare-app-kit')

module.exports = class NativeButton extends EventEmitter {
  constructor(x, y, width, height) {
    super()

    this._native = new AppKit.Button({
      x,
      y,
      width,
      height
    })
  }

  get native() {
    return this._native
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeButton }
    }
  }
}
