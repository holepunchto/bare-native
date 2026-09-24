const AppKit = require('bare-app-kit')
const { Framesetter } = require('bare-core-text')
const { constants } = require('bare-yoga')

const NativeNode = require('../node')
const style = require('../style')
const pointer = require('#pointer')

const ALIGNMENT = {
  left: AppKit.Text.ALIGNMENT.LEFT,
  center: AppKit.Text.ALIGNMENT.CENTER,
  right: AppKit.Text.ALIGNMENT.RIGHT,
  justify: AppKit.Text.ALIGNMENT.JUSTIFIED,
  natural: AppKit.Text.ALIGNMENT.NATURAL
}

const DEFAULT_FONT_SIZE = 13

// `NSTextField` draws its text inset inside the control, so a box measured
// from the glyphs alone is too small and the last word is dropped. The inset
// belongs to the cell rather than to the font, so it is measured once.
let inset = null

function cellInset(framesetter) {
  if (inset === null) {
    const probe = new AppKit.TextField({ x: 0, y: 0, width: 0, height: 0 })

    probe.editable = false
    probe.selectable = false
    probe.bordered = false
    probe.drawsBackground = false
    probe.font = AppKit.Font.systemFont(DEFAULT_FONT_SIZE)
    probe.stringValue = 'M'

    const { width } = framesetter.measure('M', { family: null, size: DEFAULT_FONT_SIZE }, Infinity)

    inset = probe.fittingSize.width - width
  }

  return inset
}

// Each line sits on an integer baseline, so the ascender and the descender
// round up separately rather than their sum. Rounding the sum comes out a
// point short at some sizes, which loses the last line.
function lineHeight(font) {
  return Math.ceil(font.ascender) + Math.ceil(-font.descender) + Math.ceil(font.leading)
}

module.exports = class NativeText extends NativeNode {
  constructor(text = '') {
    super()

    this._native = new AppKit.TextField({ x: 0, y: 0, width: 0, height: 0 })

    this._native.editable = false
    this._native.selectable = false
    this._native.bordered = false
    this._native.drawsBackground = false

    this._text = text
    this._family = null
    this._size = DEFAULT_FONT_SIZE

    // Measuring with Core Text rather than by asking the control keeps the
    // result identical on both Apple platforms and off the main work.
    this._framesetter = new Framesetter()

    this._layout.measure = this._onmeasure.bind(this)

    pointer(this, this._native)

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
    const inset = cellInset(this._framesetter)

    // The text wraps inside the inset, not inside the box, so the constraint
    // handed to Core Text is the room the control will actually give it.
    const available =
      widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : Math.max(0, width - inset)

    const measured = this._framesetter.measure(
      this._text,
      { family: this._family, size: this._size },
      available
    )

    return {
      width: measured.width + inset,
      height: measured.lines * this._lineHeight
    }
  }

  // The control and the framesetter have to agree on the font, or the text is
  // laid out to one size and drawn at another.
  _apply() {
    this._native.stringValue = this._text
    this._native.font =
      this._family === null
        ? AppKit.Font.systemFont(this._size)
        : AppKit.Font.withName(this._family, this._size)

    this._lineHeight = lineHeight(this._native.font)

    this._layout.markDirty()
  }

  _paint(properties) {
    let font = false

    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'color': {
          if (value === undefined) {
            this._native.textColor = AppKit.Color.labelColor
            break
          }

          const { red, green, blue, alpha } = style.color(value)

          this._native.textColor = AppKit.Color.rgb(red, green, blue, alpha)
          break
        }
        case 'fontFamily':
          this._family = value
          font = true
          break
        case 'fontSize':
          this._size = value === undefined ? DEFAULT_FONT_SIZE : value
          font = true
          break
        case 'textAlign':
          this._native.alignment = ALIGNMENT[value]
          break
      }
    }

    if (font) this._apply()
  }

  _destroy() {
    this._native.removeFromSuperview()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeText }
    }
  }
}
