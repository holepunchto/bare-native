const GTK = require('bare-gtk')

const NativeScrollNode = require('../scroll-node')
const forward = require('../events')
const style = require('../style')

const { OVERFLOW_HIDDEN, OVERFLOW_VISIBLE, POLICY_AUTOMATIC, POLICY_NEVER, SCROLL_NATURAL } =
  GTK.constants

let uid = 0

function rgba({ red, green, blue, alpha }) {
  return `rgba(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)}, ${alpha})`
}

module.exports = class NativeScrollView extends NativeScrollNode {
  _create(horizontal) {
    const view = new GTK.ScrolledWindow()

    view.setPolicy(
      horizontal ? POLICY_AUTOMATIC : POLICY_NEVER,
      horizontal ? POLICY_NEVER : POLICY_AUTOMATIC
    )

    // The viewport is ours rather than the one a scrolled window would make,
    // because its scroll policy has to say natural: a layout that is placed
    // rather than measured reports a minimum of zero, and the default policy
    // would take that as there being nothing to scroll.
    this._viewport = new GTK.Viewport()

    this._viewport.setScrollPolicy(SCROLL_NATURAL, SCROLL_NATURAL)

    view.child = this._viewport

    // What scrolls is the adjustment, not the window, so the position is read
    // and reported there.
    this._adjustment = horizontal ? view.hadjustment : view.vadjustment

    forward(this, this._adjustment, {
      scroll: ['value-changed', (value) => (horizontal ? { x: value, y: 0 } : { x: 0, y: value })]
    })

    this._class = `bare-native-scroll-view-${uid++}`
    view.addCssClass(this._class)

    this._provider = null
    this._declarations = {}
    this._borderColor = style.color('#0000')
    this._borderWidth = 0

    return view
  }

  get contentOffset() {
    const value = this._adjustment.value

    return this._horizontal ? { x: value, y: 0 } : { x: 0, y: value }
  }

  set contentOffset({ x = 0, y = 0 }) {
    this._adjustment.value = this._horizontal ? x : y
  }

  _insert(child, index) {
    this._viewport.child = child._native
  }

  _remove(child) {
    this._viewport.child = null
  }

  // A scrolled window sizes its child from what the child asks for, which the
  // layout manager answers with the union of the frames it was given.
  _place(child, x, y, width, height) {}

  _paint(properties) {
    let restyle = false

    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'opacity':
          this._native.opacity = value
          break
        case 'overflow':
          this._native.overflow = value === 'hidden' ? OVERFLOW_HIDDEN : OVERFLOW_VISIBLE
          break
        case 'backgroundColor':
          this._declarations['background-color'] = rgba(style.color(value))
          restyle = true
          break
        case 'borderRadius':
          this._declarations['border-radius'] = `${value}px`
          restyle = true
          break
        case 'borderColor':
          this._borderColor = style.color(value)
          restyle = true
          break
        case 'borderWidth':
          this._borderWidth = value
          restyle = true
          break
      }
    }

    if (restyle) this._restyle()
  }

  _restyle() {
    const declarations = []

    for (const name in this._declarations) {
      const value = this._declarations[name]

      if (value !== null) declarations.push(`${name}: ${value}`)
    }

    if (this._borderWidth > 0 && this._borderColor.alpha > 0) {
      declarations.push(`box-shadow: inset 0 0 0 ${this._borderWidth}px ${rgba(this._borderColor)}`)
    }

    if (this._provider === null) {
      this._provider = new GTK.CssProvider()

      GTK.StyleContext.addProviderForDisplay(
        GTK.Display.getDefault(),
        this._provider,
        GTK.constants.STYLE_PROVIDER_PRIORITY_APPLICATION
      )
    }

    this._provider.loadFromData(
      `.${this._class} { ${declarations.map((declaration) => declaration + ';').join(' ')} }`
    )
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeScrollView }
    }
  }
}
