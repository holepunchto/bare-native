const GTK = require('bare-gtk')

const NativeNode = require('../node')
const style = require('../style')

const { OVERFLOW_HIDDEN, OVERFLOW_VISIBLE, STYLE_PROVIDER_PRIORITY_APPLICATION } = GTK.constants

let uid = 0

function rgba({ red, green, blue, alpha }) {
  return `rgba(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)}, ${alpha})`
}

module.exports = class NativeView extends NativeNode {
  constructor() {
    super()

    this._native = new GTK.FrameFixed()
    this._manager = this._native.layoutManager

    this._layoutChildren = new Map()

    this._class = `bare-native-view-${uid++}`
    this._native.addCssClass(this._class)

    this._provider = null
    this._declarations = {}
    this._borderColor = style.color('#0000')
    this._borderWidth = 0
  }

  _insert(child, index) {
    const next = this._children[index]

    child._native.insertBefore(this._native, next === undefined ? null : next._native)

    this._layoutChildren.set(child, this._manager.getLayoutChild(child._native))
  }

  _remove(child) {
    this._layoutChildren.delete(child)

    child._native.unparent()
  }

  _place(child, x, y, width, height) {
    this._layoutChildren.get(child).frame = [x, y, width, height]
  }

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

    // An inset shadow rather than a border, because Yoga has already inset the
    // children by the same width and a CSS border insets the content box again.
    if (this._borderWidth > 0 && this._borderColor.alpha > 0) {
      declarations.push(`box-shadow: inset 0 0 0 ${this._borderWidth}px ${rgba(this._borderColor)}`)
    }

    if (this._provider === null) {
      this._provider = new GTK.CssProvider()

      GTK.StyleContext.addProviderForDisplay(
        GTK.Display.getDefault(),
        this._provider,
        STYLE_PROVIDER_PRIORITY_APPLICATION
      )
    }

    this._provider.loadFromData(
      `.${this._class} { ${declarations.map((declaration) => declaration + ';').join(' ')} }`
    )
  }

  _destroy() {
    if (this._provider === null) return

    GTK.StyleContext.removeProviderForDisplay(GTK.Display.getDefault(), this._provider)

    this._provider = null
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeView }
    }
  }
}
