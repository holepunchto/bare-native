const EventEmitter = require('bare-events')
const { Config: LayoutConfig } = require('bare-yoga')
const NDKActivity = require('bare-ndk/activity')
const NDKWindowInsets = require('bare-ndk/window-insets')

const { dp, scale } = require('../metrics/android')
const alert = require('../alert')
const keyboard = require('../keyboard')
const appearance = require('../appearance')
const dimensions = require('../dimensions')

const { SYSTEM_BARS, DISPLAY_CUTOUT, IME } = NDKWindowInsets.TYPE

// An activity fills the display, so the requested size is ignored.
module.exports = class NativeWindow extends EventEmitter {
  constructor(width, height) {
    super()

    this._native = NDKActivity

    this._content = null

    this._config = new LayoutConfig()
  }

  get native() {
    return this._native
  }

  get contentView() {
    return this._content
  }

  show() {
    return this
  }

  hide() {
    return this
  }

  content(view) {
    this._native.contentView(view._native)

    this._content = view

    view._native.on('sizeChanged', this._onresize.bind(this))

    // The keyboard does not always resize the window, so it is reported
    // separately.
    view._native.on('insetsChanged', this._oninsets.bind(this))

    view.env = this._env()

    this.layout()

    appearance._attach(this)
    dimensions._attach(this)
    alert._attach(this)
    keyboard._attach(this)

    return this
  }

  get keyboard() {
    const insets = this._content === null ? null : this._content.native.rootWindowInsets

    return insets === null ? 0 : dp(insets.getInsets(IME).bottom)
  }

  get size() {
    if (this._content === null) return { width: 0, height: 0 }

    const { width, height } = this._content.native

    return { width: dp(width), height: dp(height) }
  }

  get scale() {
    return scale
  }

  layout() {
    if (this._content === null) return

    if (this._content.destroyed) return

    const { width, height } = this.size

    if (width === 0 || height === 0) return

    this._config.pointScaleFactor = this.scale

    this._content.layout(width, height, this._config)
  }

  // Android reports insets per window rather than per view.
  _env() {
    const insets = this._content.native.rootWindowInsets

    if (insets === null) return undefined

    const { top, right, bottom, left } = insets.getInsets(SYSTEM_BARS | DISPLAY_CUTOUT)

    return {
      'safe-area-inset-top': dp(top),
      'safe-area-inset-right': dp(right),
      'safe-area-inset-bottom': dp(bottom),
      'safe-area-inset-left': dp(left),
      'keyboard-inset-height': dp(insets.getInsets(IME).bottom)
    }
  }

  _oninsets() {
    if (this._content === null) return

    this._content.env = this._env()

    this.layout()

    keyboard._changed()
  }

  // The insets change with the configuration, so they are read back each time.
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
