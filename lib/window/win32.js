const EventEmitter = require('bare-events')
const WinUIWindow = require('bare-win-ui/window')

module.exports = class NativeWindow extends EventEmitter {
  constructor(width, height) {
    super()

    this._native = new WinUIWindow()

    this._content = null

    this._native.on('sizeChanged', this._onresize.bind(this))

    this._native.activate().resizeClient(width, height)
  }

  get native() {
    return this._native
  }

  get contentView() {
    return this._content
  }

  content(view) {
    this._native.content = view._native
    this._content = view

    this.layout()

    return this
  }

  layout() {
    if (this._content === null) return

    if (this._content.destroyed) return

    const { width, height } = this._native.bounds

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
