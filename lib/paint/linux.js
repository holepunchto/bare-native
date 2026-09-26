const GTKCssProvider = require('bare-gtk/css-provider')
const GTKDisplay = require('bare-gtk/display')
const GTKStyleContext = require('bare-gtk/style-context')
const {
  OVERFLOW_HIDDEN,
  OVERFLOW_VISIBLE,
  STYLE_PROVIDER_PRIORITY_APPLICATION
} = require('bare-gtk/constants')

const style = require('../style')
const transform = require('../transform')

let uid = 0

function rgba({ red, green, blue, alpha }) {
  return `rgba(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)}, ${alpha})`
}

// GTK paints through the stylesheet, so a widget is given a class of its own
// and a provider that describes it. Every primitive that paints needs the
// same, which is what this holds.
module.exports = exports = class LinuxPaint {
  constructor(widget, opts = {}) {
    const { group = false } = opts

    this._widget = widget

    // A `GtkFixed` hides its overflow from the moment it is made, because it
    // can put a child anywhere, and CSS says a box shows what leaves it.
    if (group) this._widget.overflow = OVERFLOW_VISIBLE

    this._class = `bare-native-paint-${uid++}`
    this._widget.addCssClass(this._class)

    this._provider = null
    this._declarations = {}
    this._borderColor = style.color('#0000')
    this._borderWidth = 0
    this._focus = {}
    this._matrix = null
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

    if ('transform' in properties) this._transform(properties)
  }

  // GTK gives a widget no transform of its own: what it is drawn through is
  // what the parent allocated it with, so this goes on the layout child the
  // parent already keeps the frame on.
  _transform({ transform: matrix, transformOrigin: origin }) {
    const composed = matrix === null ? null : transform.around(matrix, origin)

    if (transform.equal(this._matrix, composed)) return

    const parent = this._widget.parent

    // A node styled before it was placed has nobody to hold its transform
    // yet. The layout pass applies it again once it does.
    if (parent === null) return

    const manager = parent.layoutManager

    if (manager === null || typeof manager.getLayoutChild !== 'function') {
      if (composed === null) return

      throw new Error(
        'A transform is applied by the view that places a node, and no view places this one'
      )
    }

    this._matrix = composed

    manager.getLayoutChild(this._widget).transform = composed
  }

  // What a primitive paints that is not one of the six, such as the font an
  // input draws with, which GTK puts in the same stylesheet.
  declare(properties) {
    for (const name in properties) this._declarations[name] = properties[name]

    this._restyle()
  }

  // What the same node paints while it has the focus. GTK says that with a
  // pseudo class, which is a second rule rather than a second value.
  focus(properties) {
    for (const name in properties) this._focus[name] = properties[name]

    this._restyle()
  }

  destroy() {
    if (this._provider === null) return

    GTKStyleContext.removeProviderForDisplay(GTKDisplay.getDefault(), this._provider)

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
      this._provider = new GTKCssProvider()

      GTKStyleContext.addProviderForDisplay(
        GTKDisplay.getDefault(),
        this._provider,
        STYLE_PROVIDER_PRIORITY_APPLICATION
      )
    }

    const rules = [
      `.${this._class} { ${declarations.map((declaration) => declaration + ';').join(' ')} }`
    ]

    const focused = []

    for (const name in this._focus) {
      const value = this._focus[name]

      if (value !== null) focused.push(`${name}: ${value}`)
    }

    if (focused.length > 0) {
      rules.push(
        `.${this._class}:focus-within { ${focused.map((declaration) => declaration + ';').join(' ')} }`
      )
    }

    this._provider.loadFromData(rules.join(' '))
  }
}
