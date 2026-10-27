const EventEmitter = require('bare-events')
const { Config: LayoutConfig } = require('bare-yoga')
const WinUIWindow = require('bare-win-ui/window')
const alert = require('../alert')
const keyboard = require('../keyboard')
const appearance = require('../appearance')
const dimensions = require('../dimensions')

const CONSUMED = ['pointerPressed', 'pointerReleased']

module.exports = class NativeWindow extends EventEmitter {
  constructor(width, height) {
    super()

    this._native = new WinUIWindow()

    this._content = null

    this._config = new LayoutConfig()
    this._watched = null
    this._hidden = false

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
    // A window hidden through its app window is shown through it again.
    if (this._hidden) this._native.appWindow.show()

    this._hidden = false
    this._native.activate()

    return this
  }

  hide() {
    this._native.appWindow.hide()

    this._hidden = true

    return this
  }

  content(view) {
    if (this._content !== null) {
      for (const name of CONSUMED) this._content._native.off(name, consume)
    }

    for (const name of CONSUMED) view._native.on(name, consume)

    this._native.content = view._native
    this._content = view

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

    const { width, height } = this._native.bounds

    return { width, height }
  }

  // XAML only knows once the content is in its tree.
  get scale() {
    const root = this._root()

    return root === null ? 1 : root.rasterizationScale
  }

  // Layout is rounded to pixels, which change between displays, and only the
  // XAML root reports that.
  _root() {
    const root = this._content === null ? null : this._content.native.xamlRoot

    if (root !== null && root !== this._watched) {
      this._watched = root

      root.on('changed', this.layout.bind(this))
    }

    return root
  }

  layout() {
    if (this._content === null) return

    if (this._content.destroyed) return

    const { width, height } = this.size

    this._config.pointScaleFactor = this.scale

    this._content.layout(width, height, this._config)
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

function consume(args) {
  args.handled = true
}
