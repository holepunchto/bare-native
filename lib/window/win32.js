const EventEmitter = require('bare-events')
const WinUIWindow = require('bare-win-ui/window')
const alert = require('../alert')
const keyboard = require('../keyboard')
const appearance = require('../appearance')
const dimensions = require('../dimensions')

module.exports = class NativeWindow extends EventEmitter {
  constructor(width, height) {
    super()

    this._native = new WinUIWindow()

    this._content = null

    this._native.on('sizeChanged', this._onresize.bind(this))

    this._native.resizeClient(width, height)
  }

  get native() {
    return this._native
  }

  get contentView() {
    return this._content
  }

  show() {
    this._native.activate()

    return this
  }

  content(view) {
    this._native.content = view._native
    this._content = view

    this.layout()

    appearance._attach(this)
    dimensions._attach(this)
    alert._attach(this)
    keyboard._attach(this)

    return this
  }

  // No software keyboard on this platform, so nothing ever covers the window.
  get keyboard() {
    return 0
  }

  // The room the tree has, which is the content area rather than the frame
  // around it.
  get size() {
    const { width, height } = this._native.bounds

    return { width, height }
  }

  layout() {
    if (this._content === null) return

    if (this._content.destroyed) return

    const { width, height } = this.size

    this._content.layout(width, height)
  }

  _onresize() {
    this.layout()

    this.emit('resize')
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWindow }
    }
  }
}
