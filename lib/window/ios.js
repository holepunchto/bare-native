const EventEmitter = require('bare-events')
const UIKit = require('bare-ui-kit')

module.exports = class NativeWindow extends EventEmitter {
  constructor() {
    super()

    this._native = new UIKit.Window()

    this._native.hidden = false
    this._native.makeKeyWindow()
  }

  get native() {
    return this._native
  }

  content(view) {
    const viewController = new UIKit.ViewController()
    viewController.view = view._native

    this._native.rootViewController = viewController
    return this
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWindow }
    }
  }
}
