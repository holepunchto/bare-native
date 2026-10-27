const EventEmitter = require('bare-events')
const { Config: LayoutConfig } = require('bare-yoga')
const UIKitScene = require('bare-ui-kit/scene')
const UIKitViewController = require('bare-ui-kit/view-controller')
const UIKitWindow = require('bare-ui-kit/window')
const alert = require('../alert')
const keyboard = require('../keyboard')
const appearance = require('../appearance')
const dimensions = require('../dimensions')

module.exports = class NativeWindow extends EventEmitter {
  constructor(width, height) {
    super()

    // The runtime brings up exactly one scene before this runs.
    const scene = UIKitScene.connected[0]

    this._native = new UIKitWindow({ scene })
    this._controller = new UIKitViewController()
    this._content = null

    this._config = new LayoutConfig()
    this._keyboard = 0

    this._native.on('keyboardWillChangeFrame', this._onkeyboard.bind(this))

    this._native.rootViewController = this._controller

    this._controller.on('didLayoutSubviews', this._onlayout.bind(this))
    this._controller.on('safeAreaInsetsDidChange', this._oninsets.bind(this))
  }

  get native() {
    return this._native
  }

  get contentView() {
    return this._content
  }

  show() {
    this._native.makeKeyAndVisible()

    return this
  }

  hide() {
    this._native.hidden = true

    return this
  }

  content(view) {
    this._controller.view = view._native
    this._content = view

    // A view replacing one already in the window is swapped in by UIKit, but one
    // replacing a removed view must be added.
    if (view._native.superview === null) this._native.addSubview(view._native)

    // UIKit only sizes the root view controller's view when the window installs
    // it, so a later replacement must be sized here.
    view._native.frame = this._native.bounds

    view.env = this._env()

    this.layout()

    appearance._attach(this)
    dimensions._attach(this)
    alert._attach(this)
    keyboard._attach(this)

    return this
  }

  get keyboard() {
    return this._keyboard
  }

  get size() {
    if (this._content === null) return { width: 0, height: 0 }

    const { width, height } = this._content.native.frame

    return { width, height }
  }

  get scale() {
    return this._native.windowScene.screen.scale
  }

  layout() {
    if (this._content === null) return

    if (this._content.destroyed) return

    const { width, height } = this.size

    this._config.pointScaleFactor = this.scale

    this._content.layout(width, height, this._config)
  }

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

  // UIKit reports the keyboard frame, so the covered part is its overlap with
  // the window. It arrives before the keyboard finishes moving, letting the
  // layout make room in time.
  _onkeyboard({ y }) {
    const { height } = this._native.bounds

    const covered = Math.max(0, Math.min(height, height - y))

    if (covered === this._keyboard) return

    this._keyboard = covered

    if (this._content !== null) this._content.env = this._env()

    this.layout()

    keyboard._changed()
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
