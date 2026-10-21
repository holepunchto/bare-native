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
const Cursor = require('#cursor')

let uid = 0

function rgba({ red, green, blue, alpha }) {
  return `rgba(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)}, ${alpha})`
}

// GTK paints through CSS, so each widget gets its own class and style
// provider.
module.exports = exports = class LinuxPaint {
  constructor(widget, opts = {}) {
    const { group = false } = opts

    this._widget = widget
    this._cursor = new Cursor(widget)

    // A `GtkFixed` clips its overflow by default and CSS does not.
    if (group) this._widget.overflow = OVERFLOW_VISIBLE

    this._class = `bare-native-paint-${uid++}`
    this._widget.addCssClass(this._class)

    this._provider = null
    this._declarations = {}
    this._borderColor = style.color('#0000')
    this._borderWidth = 0
    this._borderStyle = 'solid'
    this._radius = 0
    this._corners = {}
    this._rounded = false
    this._focus = {}
    this._matrix = null
    this._shadowColor = style.color('#000')
    this._shadowOffset = { width: 0, height: 0 }
    this._shadowOpacity = 0
    this._shadowRadius = 0
  }

  apply(properties) {
    let restyle = false

    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'cursor':
          this._cursor.set(style.pointer(value))
          break
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
          this._radius = value
          this._rounded = true
          restyle = true
          break
        case 'borderTopLeftRadius':
          this._corners.topLeft = value
          this._rounded = true
          restyle = true
          break
        case 'borderTopRightRadius':
          this._corners.topRight = value
          this._rounded = true
          restyle = true
          break
        case 'borderBottomRightRadius':
          this._corners.bottomRight = value
          this._rounded = true
          restyle = true
          break
        case 'borderBottomLeftRadius':
          this._corners.bottomLeft = value
          this._rounded = true
          restyle = true
          break
        case 'borderStyle':
          this._borderStyle = style.stroke(value)
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
        case 'shadowColor':
          this._shadowColor = style.color(value)
          restyle = true
          break
        case 'shadowOffset':
          this._shadowOffset = value
          restyle = true
          break
        case 'shadowOpacity':
          this._shadowOpacity = value
          restyle = true
          break
        case 'shadowRadius':
          this._shadowRadius = value
          restyle = true
          break
      }
    }

    if (restyle) this._restyle()

    if ('transform' in properties) this._transform(properties)
  }

  // GTK has no widget transform, so it is set on the layout child that holds
  // the frame.
  _transform({ transform: matrix, transformOrigin: origin }) {
    const composed = matrix === null ? null : transform.around(matrix, origin)

    if (transform.equal(this._matrix, composed)) return

    const parent = this._widget.parent

    // A node styled before it was placed has no layout child yet. The layout
    // pass applies the transform again later.
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

  declare(properties) {
    for (const name in properties) this._declarations[name] = properties[name]

    this._restyle()
  }

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

    // Only written when set, as GTK themes draw widgets through the same
    // stylesheet and a radius on every widget would square rounded ones like
    // switches.
    if (this._rounded) {
      this._declarations['border-radius'] = style
        .corners(this._radius, this._corners)
        .map((radius) => `${radius}px`)
        .join(' ')
    }

    for (const name in this._declarations) {
      const value = this._declarations[name]

      if (value !== null) declarations.push(`${name}: ${value}`)
    }

    const shadows = []

    // An inset shadow rather than a border, because Yoga already insets the
    // children and a CSS border would inset them again. Dashes need a real
    // border.
    if (this._borderWidth > 0 && this._borderColor.alpha > 0) {
      if (this._borderStyle === 'solid') {
        shadows.push(`inset 0 0 0 ${this._borderWidth}px ${rgba(this._borderColor)}`)
      } else {
        declarations.push(
          `border: ${this._borderWidth}px ${this._borderStyle} ${rgba(this._borderColor)}`
        )
      }
    }

    if (this._shadowOpacity > 0 && this._shadowColor.alpha > 0) {
      const { width = 0, height = 0 } = this._shadowOffset

      const color = rgba({
        ...this._shadowColor,
        alpha: this._shadowColor.alpha * this._shadowOpacity
      })

      // CSS treats the blur radius as twice the standard deviation.
      shadows.push(`${width}px ${height}px ${this._shadowRadius * 2}px ${color}`)
    }

    if (shadows.length > 0) declarations.push(`box-shadow: ${shadows.join(', ')}`)

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
