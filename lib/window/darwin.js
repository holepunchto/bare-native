const EventEmitter = require('bare-events')
const AppKit = require('bare-app-kit')

const DEFAULT_STYLE_MASK =
  AppKit.Window.STYLE_MASK.TITLED |
  AppKit.Window.STYLE_MASK.CLOSABLE |
  AppKit.Window.STYLE_MASK.MINIATURIZABLE |
  AppKit.Window.STYLE_MASK.RESIZABLE

module.exports = class NativeWindow extends EventEmitter {
  constructor(width, height) {
    super()

    this._native = new AppKit.Window({
      width,
      height,
      styleMask: DEFAULT_STYLE_MASK
    })

    this._native.center()
  }

  get native() {
    return this._native
  }

  show() {
    this._native.makeKeyWindow().orderFront()
    return this
  }

  content(view) {
    this._native.contentView = view._native
    return this
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWindow }
    }
  }
}
