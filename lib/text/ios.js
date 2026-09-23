const UIKit = require('bare-ui-kit')
const { Framesetter } = require('bare-core-text')
const { constants } = require('bare-yoga')

const NativeNode = require('../node')
const style = require('../style')

const ALIGNMENT = {
  left: UIKit.Label.ALIGNMENT.LEFT,
  center: UIKit.Label.ALIGNMENT.CENTER,
  right: UIKit.Label.ALIGNMENT.RIGHT,
  justify: UIKit.Label.ALIGNMENT.JUSTIFIED,
  natural: UIKit.Label.ALIGNMENT.NATURAL
}

const DEFAULT_FONT_SIZE = 17

module.exports = class NativeText extends NativeNode {
  constructor(text = '') {
    super()

    this._native = new UIKit.Label()

    // Yoga decides the box, so the label wraps to it rather than truncating
    // to a single line.
    this._native.numberOfLines = 0
    this._native.lineBreakMode = UIKit.Label.LINE_BREAK_MODE.WORD_WRAPPING

    this._text = text
    this._family = null
    this._size = DEFAULT_FONT_SIZE

    // Measuring with Core Text rather than by asking the control keeps the
    // result identical on both Apple platforms and off the main work.
    this._framesetter = new Framesetter()

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

    const measured = this._framesetter.measure(
      this._text,
      { family: this._family, size: this._size },
      available
    )

    // A label lays each line out on an integer baseline, so how tall the text
    // ends up is the control's line height rather than Core Text's.
    return { width: measured.width, height: measured.lines * this._lineHeight }
  }

  // The control and the framesetter have to agree on the font, or the text is
  // laid out to one size and drawn at another.
  _apply() {
    this._native.text = this._text
    this._native.font =
      this._family === null
        ? UIKit.Font.systemFont(this._size)
        : UIKit.Font.withName(this._family, this._size)

    this._lineHeight = Math.ceil(this._native.font.lineHeight)

    this._layout.markDirty()
  }

  _paint(properties) {
    let font = false

    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'color': {
          if (value === undefined) {
            this._native.textColor = UIKit.Color.labelColor
            break
          }

          const { red, green, blue, alpha } = style.color(value)

          this._native.textColor = UIKit.Color.rgb(red, green, blue, alpha)
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
          this._native.textAlignment = ALIGNMENT[value]
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
