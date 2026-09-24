const WinUI = require('bare-win-ui')
const { constants } = require('bare-yoga')

const NativeTextNode = require('../text-node')
const style = require('../style')

const { Run, TextBlock } = WinUI

const ALIGNMENT = {
  left: TextBlock.TEXT_ALIGNMENT.LEFT,
  center: TextBlock.TEXT_ALIGNMENT.CENTER,
  right: TextBlock.TEXT_ALIGNMENT.RIGHT,
  justify: TextBlock.TEXT_ALIGNMENT.JUSTIFY,
  natural: TextBlock.TEXT_ALIGNMENT.START
}

const DEFAULT_FONT_SIZE = 14

const CACHE_LIMIT = 4096

const families = new Map()

function family(name) {
  let resolved = families.get(name)

  if (resolved === undefined) {
    resolved = new WinUI.FontFamily({ familyName: name })

    if (families.size === CACHE_LIMIT) families.delete(families.keys().next().value)

    families.set(name, resolved)
  }

  return resolved
}

module.exports = class NativeText extends NativeTextNode {
  constructor(text = '') {
    super(text)

    this._native = new TextBlock()
    this._native.textWrapping = TextBlock.TEXT_WRAPPING.WRAP

    this._defaults = {
      fontFamily: this._native.fontFamily,
      foreground: this._native.foreground
    }

    this._inlines = this._native.inlines

    this._layout.measure = this._onmeasure.bind(this)

    this._apply()
  }

  // Measuring the element that draws is what keeps the two from disagreeing,
  // and nothing else here measures it: a parent places a child at the size
  // Yoga worked out. That size is on the element, though, and it would come
  // straight back as what the element wants, so it goes back to `Auto`, which
  // is what XAML calls a width of `NaN`, and `_place` states it again.
  _onmeasure(width, widthMode, height, heightMode) {
    this._native.width = NaN
    this._native.height = NaN

    this._native.measure(
      widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : width,
      Infinity
    )

    return this._native.desiredSize
  }

  // A text block holds its text as inlines, and a run is one of them, so the
  // runs go in as themselves rather than as a string and a style beside it.
  _apply() {
    this._inlines.clear()

    for (const run of this._runs) {
      const inline = new Run()

      inline.text = run.text
      inline.fontSize = run.style.fontSize === undefined ? DEFAULT_FONT_SIZE : run.style.fontSize
      inline.fontFamily =
        run.style.fontFamily === undefined || run.style.fontFamily === null
          ? this._defaults.fontFamily
          : family(run.style.fontFamily)
      inline.fontWeight = style.weight(run.style.fontWeight) || 400
      inline.fontStyle = style.italic(run.style.fontStyle)
        ? Run.FONT_STYLE.ITALIC
        : Run.FONT_STYLE.NORMAL

      if (run.style.color === undefined) {
        inline.foreground = this._defaults.foreground
      } else {
        const { red, green, blue, alpha } = style.color(run.style.color)

        inline.foreground = new WinUI.SolidColorBrush({
          color: {
            a: Math.round(alpha * 255),
            r: Math.round(red * 255),
            g: Math.round(green * 255),
            b: Math.round(blue * 255)
          }
        })
      }

      this._inlines.append(inline)
    }

    this._layout.markDirty()
  }

  _paint(properties) {
    const changed = this._inherit(properties)

    if ('textAlign' in properties) {
      this._native.textAlignment = ALIGNMENT[properties.textAlign]
    }

    if (changed) this._apply()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeText }
    }
  }
}
