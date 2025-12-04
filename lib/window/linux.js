const EventEmitter = require('bare-events')
const GTK = require('bare-gtk')

module.exports = class NativeWindow extends EventEmitter {
  constructor(width, height) {
    super()

    this._native = new GTK.Window()

    this._native.defaultSize = [width, height]
  }

  get native() {
    return this._native
  }

  show() {
    this._native.visible = true
    return this
  }

  content(view) {
    this._native.child = view._native
    return this
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWindow }
    }
  }
}
