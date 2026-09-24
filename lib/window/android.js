const EventEmitter = require('bare-events')
const NDK = require('bare-ndk')

const { dp } = require('../metrics/android')

const { SYSTEM_BARS, DISPLAY_CUTOUT } = NDK.WindowInsets.TYPE

// An activity fills the display, so the size a caller asks for is ignored.
module.exports = class NativeWindow extends EventEmitter {
  constructor(width, height) {
    super()

    this._native = NDK.Activity

    this._content = null
  }

  get native() {
    return this._native
  }

  get contentView() {
    return this._content
  }

  content(view) {
    this._native.contentView(view._native)

    this._content = view

    // A group reports its own size changing, which is the content area.
    view._native.on('sizeChanged', this._onresize.bind(this))

    view.env = this._env()

    this.layout()

    return this
  }

  layout() {
    if (this._content === null) return

    if (this._content.destroyed) return

    const { width, height } = this._content.native

    // A view has no size until it has been laid out once.
    if (width === 0 || height === 0) return

    this._content.layout(dp(width), dp(height))
  }

  // Android reports the insets against the window rather than per view.
  _env() {
    const insets = this._content.native.rootWindowInsets

    if (insets === null) return undefined

    const { top, right, bottom, left } = insets.getInsets(SYSTEM_BARS | DISPLAY_CUTOUT)

    return {
      'safe-area-inset-top': dp(top),
      'safe-area-inset-right': dp(right),
      'safe-area-inset-bottom': dp(bottom),
      'safe-area-inset-left': dp(left)
    }
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
