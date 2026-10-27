const EventEmitter = require('bare-events')
const { Config: LayoutConfig } = require('bare-yoga')
const AppKitWindow = require('bare-app-kit/window')
const alert = require('../alert')
const keyboard = require('../keyboard')
const appearance = require('../appearance')
const dimensions = require('../dimensions')

const DEFAULT_STYLE_MASK =
  AppKitWindow.STYLE_MASK.TITLED |
  AppKitWindow.STYLE_MASK.CLOSABLE |
  AppKitWindow.STYLE_MASK.MINIATURIZABLE |
  AppKitWindow.STYLE_MASK.RESIZABLE

module.exports = class NativeWindow extends EventEmitter {
  constructor(width, height) {
    super()

    this._native = new AppKitWindow({
      width,
      height,
      styleMask: DEFAULT_STYLE_MASK
    })

    // A window built without a nib does not recalculate its key view loop when
    // its views change, leaving controls unreachable by the tab key.
    this._native.autorecalculatesKeyViewLoop = true

    this._content = null

    this._config = new LayoutConfig()

    this._native.on('didResize', this._onresize.bind(this))

    // Layout is rounded to pixels, which change between displays.
    this._native.on('didChangeBackingProperties', this.layout.bind(this))

    this._native.center()
  }

  show() {
    this._native.makeKeyAndOrderFront()

    return this
  }

  // Ordered out rather than closed, as closing the last window may quit the
  // application.
  hide() {
    this._native.orderOut()

    return this
  }

  get native() {
    return this._native
  }

  get contentView() {
    return this._content
  }

  content(view) {
    this._native.contentView = view._native
    this._content = view

    // Without this the window itself is first responder and nothing is reachable
    // by keyboard.
    this._native.initialFirstResponder = view._native

    view.env = this._env()

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

    const { width, height } = this._content.native.frame

    return { width, height }
  }

  get scale() {
    return this._native.backingScaleFactor
  }

  layout() {
    if (this._content === null) return

    if (this._content.destroyed) return

    const { width, height } = this.size

    this._config.pointScaleFactor = this.scale

    this._content.layout(width, height, this._config)
  }

  _env() {
    const { top, right, bottom, left } = this._content.native.safeAreaInsets

    return {
      'safe-area-inset-top': top,
      'safe-area-inset-right': right,
      'safe-area-inset-bottom': bottom,
      'safe-area-inset-left': left
    }
  }

  // There is no notification for inset changes, so they are read back on resize.
  _onresize() {
    if (this._content !== null) this._content.env = this._env()

    this.layout()

    this.emit('resize')
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWindow }
    }
  }
}
