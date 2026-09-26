const EventEmitter = require('bare-events')
const AppKitWindow = require('bare-app-kit/window')

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

    // A window works out what the tab key reaches by walking its views, and a
    // window built rather than loaded from a nib does not do it again when
    // that tree changes. Without this there is no key view loop at all, and a
    // control drawing its focus is a control nothing can give the focus to.
    this._native.autorecalculatesKeyViewLoop = true

    this._content = null

    this._native.on('didResize', this._onresize.bind(this))

    this._native.makeKeyWindow().orderFront().center()
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

    // Where the tab key starts walking. A window whose first responder is the
    // window itself has nowhere to begin, so nothing is reachable by keyboard
    // until something has been given the focus another way.
    this._native.initialFirstResponder = view._native

    view.env = this._env()

    this.layout()

    return this
  }

  // The window is the only thing that knows how much room the tree has, so it
  // is what starts a layout pass.
  layout() {
    if (this._content === null) return

    if (this._content.destroyed) return

    const { width, height } = this._content.native.frame

    this._content.layout(width, height)
  }

  // AppKit reports what the titlebar, a full screen transition or a notched
  // display are covering. It is zero on an ordinary window.
  _env() {
    const { top, right, bottom, left } = this._content.native.safeAreaInsets

    return {
      'safe-area-inset-top': top,
      'safe-area-inset-right': right,
      'safe-area-inset-bottom': bottom,
      'safe-area-inset-left': left
    }
  }

  // There is no separate notification for the insets, so they are read back
  // whenever the window changes size, which is when they can have changed.
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
