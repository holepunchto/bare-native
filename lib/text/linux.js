const GTK = require('bare-gtk')
const { measure } = require('bare-gtk/text')
const { constants } = require('bare-yoga')

const NativeNode = require('../node')
const style = require('../style')

const {
  JUSTIFY_CENTER,
  JUSTIFY_FILL,
  JUSTIFY_LEFT,
  JUSTIFY_RIGHT,
  WRAP_WORD_CHAR,
  STYLE_PROVIDER_PRIORITY_APPLICATION
} = GTK.constants

// GTK splits what CSS calls text alignment in two: where the lines sit in the
// box, and how a wrapped line fills it.
const ALIGNMENT = {
  left: [0, JUSTIFY_LEFT],
  center: [0.5, JUSTIFY_CENTER],
  right: [1, JUSTIFY_RIGHT],
  justify: [0, JUSTIFY_FILL],
  natural: [0, JUSTIFY_LEFT]
}

let uid = 0

module.exports = class NativeText extends NativeNode {
  constructor(text = '') {
    super()

    this._native = new GTK.Label()

    // Yoga owns the box, so the label wraps into it rather than settling on a
    // width of its own, and sits at its top left corner.
    this._native.wrap = true
    this._native.wrapMode = WRAP_WORD_CHAR
    this._native.xalign = 0
    this._native.yalign = 0

    this._text = text
    this._family = null
    this._size = 0

    this._class = `bare-native-text-${uid++}`
    this._native.addCssClass(this._class)

    this._provider = null
    this._declarations = {}

    this._layout.measure = this._onmeasure.bind(this)

    this._apply()
  }

  get text() {
    return this._text
  }

  set text(value) {
    if (value === this._text) return

    this._text = value

    this._apply()
  }

  get _paintable() {
    return style.TEXT
  }

  get _container() {
    return false
  }

  _onmeasure(width, widthMode, height, heightMode) {
    const available = widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : width

    const measured = measure(this._text, { family: this._family, size: this._size }, available)

    return { width: measured.width, height: measured.height }
  }

  _apply() {
    this._native.text = this._text

    this._layout.markDirty()
  }

  _paint(properties) {
    let restyle = false

    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'color':
          this._declarations.color = value === undefined ? null : rgba(style.color(value))
          restyle = true
          break
        case 'fontFamily':
          this._family = value === undefined ? null : value
          this._declarations['font-family'] = this._family === null ? null : `"${this._family}"`
          restyle = true
          break
        case 'fontSize':
          this._size = value === undefined ? 0 : value
          this._declarations['font-size'] = this._size === 0 ? null : `${this._size}px`
          restyle = true
          break
        case 'textAlign': {
          const [xalign, justify] = ALIGNMENT[value] || ALIGNMENT.natural

          this._native.xalign = xalign
          this._native.justify = justify
          break
        }
      }
    }

    if (restyle) {
      this._restyle()

      // The font decides the measurement, so the layout is no longer valid.
      this._layout.markDirty()
    }
  }

  // The label and the measurement have to resolve the same font, which they do
  // because a CSS size in pixels is the absolute size Pango is measured with.
  _restyle() {
    const declarations = []

    for (const name in this._declarations) {
      const value = this._declarations[name]

      if (value !== null) declarations.push(`${name}: ${value}`)
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
      __proto__: { constructor: NativeText }
    }
  }
}

function rgba({ red, green, blue, alpha }) {
  return `rgba(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)}, ${alpha})`
}
