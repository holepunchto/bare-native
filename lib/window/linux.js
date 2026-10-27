const EventEmitter = require('bare-events')
const { Config: LayoutConfig } = require('bare-yoga')
const GTKWindow = require('bare-gtk/window')
const alert = require('../alert')
const keyboard = require('../keyboard')
const appearance = require('../appearance')
const dimensions = require('../dimensions')

module.exports = class NativeWindow extends EventEmitter {
  constructor(width, height) {
    super()

    this._native = new GTKWindow()
    this._native.defaultSize = [width, height]

    this._content = null

    this._config = new LayoutConfig()

    // Layout is rounded to pixels, which change between displays.
    this._native.on('scaleFactor', this.layout.bind(this))
  }

  get native() {
    return this._native
  }

  get contentView() {
    return this._content
  }

  show() {
    this._native.visible = true

    return this
  }

  hide() {
    this._native.visible = false

    return this
  }

  content(view) {
    this._native.child = view._native
    this._content = view

    // GTK has no window resize notification, so the new size of the content area
    // arrives through the content's own layout pass.
    const manager = view._native.layoutManager

    if (manager !== null) manager.on('resize', this._onresize.bind(this))

    this.layout()

    appearance._attach(this)
    dimensions._attach(this)
    alert._attach(this)
    keyboard._attach(this)

    return this
  }

  get keyboard() {
    return 0
  }

  get size() {
    if (this._content === null) return { width: 0, height: 0 }

    const { width, height } = this._content.native

    return { width, height }
  }

  get scale() {
    return this._native.scaleFactor
  }

  layout() {
    if (this._content === null) return

    if (this._content.destroyed) return

    const { width, height } = this.size

    // A window has no size until it has been mapped.
    if (width === 0 || height === 0) return

    this._config.pointScaleFactor = this.scale

    this._content.layout(width, height, this._config)
  }

  // Client side decorations sit outside the content area, so nothing covers it.

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
