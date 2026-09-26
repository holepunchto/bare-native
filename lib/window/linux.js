const EventEmitter = require('bare-events')
const GTKWindow = require('bare-gtk/window')

module.exports = class NativeWindow extends EventEmitter {
  constructor(width, height) {
    super()

    this._native = new GTKWindow()
    this._native.defaultSize = [width, height]

    this._content = null

    this._native.visible = true
  }

  get native() {
    return this._native
  }

  get contentView() {
    return this._content
  }

  content(view) {
    this._native.child = view._native
    this._content = view

    // GTK has no window resize notification. The content's own layout pass is
    // where its new size arrives, and it is the content area rather than the
    // window, which is what the tree is laid out in.
    const manager = view._native.layoutManager

    if (manager !== null) manager.on('resize', this._onresize.bind(this))

    this.layout()

    return this
  }

  layout() {
    if (this._content === null) return

    if (this._content.destroyed) return

    const { width, height } = this._content.native

    // A window has no size until it has been mapped.
    if (width === 0 || height === 0) return

    this._content.layout(width, height)
  }

  // Client side decorations sit outside the content area, so nothing covers it
  // and the insets stay at the zero they already default to.

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
