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

    this._native.on('mouseDown', () => this.emit('mouseDown'))
    this._native.on('mouseUp', () => this.emit('mouseUp'))
    this._native.on('click', () => this.emit('click'))
  }

  get native() {
    return this._native
  }

  get title() {
    return this._native.title
  }

  set title(title) {
    this._native.title = title
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeButton }
    }
  }
}
