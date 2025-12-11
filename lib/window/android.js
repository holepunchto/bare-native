const EventEmitter = require('bare-events')
const NDK = require('bare-ndk')

module.exports = class NativeWindow extends EventEmitter {
  constructor() {
    super()

    this._native = NDK.Activity
  }

  get native() {
    return this._native
  }

  show() {
    return this
  }

  content(view) {
    this._native.contentView(view._native)
    return this
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWindow }
    }
  }
}
