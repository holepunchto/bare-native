const EventEmitter = require('bare-events')
const UIKit = require('bare-ui-kit')

module.exports = class NativeWindow extends EventEmitter {
  constructor() {
    super()

    // A window belongs to a scene, and the runtime brings exactly one up
    // before any of this runs.
    const scene = UIKit.Scene.connected[0]

    this._native = new UIKit.Window({ scene, ...scene.screen.bounds })
    this._controller = new UIKit.ViewController()
    this._content = null
    this._keyboard = 0

    this._native.on('keyboardWillChangeFrame', this._onkeyboard.bind(this))

    this._native.rootViewController = this._controller

    this._controller.on('didLayoutSubviews', this._onlayout.bind(this))
    this._controller.on('safeAreaInsetsDidChange', this._oninsets.bind(this))

    this._native.makeKeyAndVisible()
  }

  get native() {
    return this._native
  }

  get contentView() {
    return this._content
  }

  // The controller owns the root view's frame, so the content becomes that
  // view rather than being added underneath one.
  content(view) {
    this._controller.view = view._native
    this._content = view

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

  // UIKit reports what the status bar, the home indicator and the cutout are
  // covering.
  _env() {
    const { top, right, bottom, left } = this._controller.view.safeAreaInsets

    return {
      'safe-area-inset-top': top,
      'safe-area-inset-right': right,
      'safe-area-inset-bottom': bottom,
      'safe-area-inset-left': left,
      'keyboard-inset-height': this._keyboard
    }
  }

  // UIKit reports where the keyboard will be rather than what it covers, so
  // what it covers of this window is the overlap of the two. It is reported
  // before it has finished moving, which is what a tree laying itself out
  // around it wants: the room is gone by the time the keyboard is there.
  _onkeyboard({ y }) {
    const { height } = this._native.bounds

    const covered = Math.max(0, Math.min(height, height - y))

    if (covered === this._keyboard) return

    this._keyboard = covered

    if (this._content !== null) this._content.env = this._env()

    this.layout()
  }

  _oninsets() {
    if (this._content === null) return

    this._content.env = this._env()

    this.layout()
  }

  _onlayout() {
    this.layout()

    this.emit('resize')
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeWindow }
    }
  }
}
