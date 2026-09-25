const GTK = require('bare-gtk')

const style = require('../style')

const { OVERFLOW_HIDDEN, OVERFLOW_VISIBLE, STYLE_PROVIDER_PRIORITY_APPLICATION } = GTK.constants

let uid = 0

function rgba({ red, green, blue, alpha }) {
  return `rgba(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)}, ${alpha})`
}

// GTK paints through the stylesheet, so a widget is given a class of its own
// and a provider that describes it. Every primitive that paints needs the
// same, which is what this holds.
module.exports = exports = class LinuxPaint {
  constructor(widget) {
    this._widget = widget

    this._class = `bare-native-paint-${uid++}`
    this._widget.addCssClass(this._class)

    this._provider = null
    this._declarations = {}
    this._borderColor = style.color('#0000')
    this._borderWidth = 0
  }

  apply(properties) {
    let restyle = false

    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'opacity':
          this._widget.opacity = value
          break
        case 'overflow':
          this._widget.overflow = value === 'hidden' ? OVERFLOW_HIDDEN : OVERFLOW_VISIBLE
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

  // What a primitive paints that is not one of the six, such as the font an
  // input draws with, which GTK puts in the same stylesheet.
  declare(properties) {
    for (const name in properties) this._declarations[name] = properties[name]

    this._restyle()
  }

  destroy() {
    if (this._provider === null) return

    GTK.StyleContext.removeProviderForDisplay(GTK.Display.getDefault(), this._provider)

    this._provider = null
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
}
