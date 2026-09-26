const GTKEntry = require('bare-gtk/entry')
const GTKEventControllerFocus = require('bare-gtk/event-controller-focus')
const GTKTextView = require('bare-gtk/text-view')
const { measure } = require('bare-gtk/text')
const {
  JUSTIFY_CENTER,
  JUSTIFY_FILL,
  JUSTIFY_LEFT,
  JUSTIFY_RIGHT,
  WRAP_WORD_CHAR
} = require('bare-gtk/constants')
const { constants } = require('bare-yoga')

const NativeTextInputNode = require('../text-input-node')
const Paint = require('../paint/linux')
const style = require('../style')

const { INPUT_PURPOSE, INPUT_HINTS } = GTKEntry

// One line and many lines put their text in different places: an entry has a
// fraction of the room it was given and a text view has a justification.
const ALIGNMENT = {
  left: [0, JUSTIFY_LEFT],
  center: [0.5, JUSTIFY_CENTER],
  right: [1, JUSTIFY_RIGHT],
  justify: [0, JUSTIFY_FILL],
  natural: [0, JUSTIFY_LEFT]
}

// GTK says what a keyboard is for rather than which keyboard to show, which is
// the same thing from the other side.
const PURPOSE = {
  default: INPUT_PURPOSE.FREE_FORM,
  'number-pad': INPUT_PURPOSE.DIGITS,
  'decimal-pad': INPUT_PURPOSE.NUMBER,
  numeric: INPUT_PURPOSE.NUMBER,
  'email-address': INPUT_PURPOSE.EMAIL,
  'phone-pad': INPUT_PURPOSE.PHONE,
  url: INPUT_PURPOSE.URL
}

const CAPITALIZE = {
  none: INPUT_HINTS.LOWERCASE,
  sentences: INPUT_HINTS.UPPERCASE_SENTENCES,
  words: INPUT_HINTS.UPPERCASE_WORDS,
  characters: INPUT_HINTS.UPPERCASE_CHARS
}

const DEFAULT_FONT_SIZE = 14

function rgba({ red, green, blue, alpha }) {
  return `rgba(${Math.round(red * 255)}, ${Math.round(green * 255)}, ${Math.round(blue * 255)}, ${alpha})`
}

// A `GtkEntry` is one line and a `GtkTextView` is many, and the second keeps
// its text in a buffer rather than on the widget, so what reports a change is
// a different object from what is placed.
module.exports = class NativeTextInput extends NativeTextInputNode {
  constructor(opts) {
    super(opts)

    if (this._multiline) {
      this._native = new GTKTextView()
      this._native.wrapMode = WRAP_WORD_CHAR

      this._buffer = this._native.buffer

      this._buffer.on('changed', this._changed.bind(this))
      this._buffer.on('cursor-position', this._moved.bind(this))

      this._buffer.on('insert-text', (text, start) => this._typed(text, start, start))
      this._buffer.on('delete-range', (text, start, end) => this._typed('', start, end))
    } else {
      this._native = new GTKEntry()

      this._buffer = null

      this._native.on('changed', this._changed.bind(this))
      this._native.on('cursor-position', this._moved.bind(this))
      this._native.on('activate', () => this._submitted())

      this._native.on('insert-text', (text, start) => this._typed(text, start, start))
      this._native.on('delete-text', (text, start, end) => this._typed('', start, end))

      this._native.visibility = this._secureTextEntry === false
    }

    // Focus arrives through a controller added to the widget, as input does;
    // the widget's own properties say whether it has focus and never when it
    // changed. The controller is made here rather than with the first
    // listener, because an input always reports focus.
    this._focusing = new GTKEventControllerFocus()

    this._focusing.on('enter', this._focused.bind(this))
    this._focusing.on('leave', this._blurred.bind(this))

    this._native.addController(this._focusing)

    this._painter = new Paint(this._native)

    this._metrics = { family: null, size: DEFAULT_FONT_SIZE }

    this._restyle()
    this._ringed(true)

    this._hinted()

    if (this._multiline === false) this._layout.measure = this._onmeasure.bind(this)
  }

  _onmeasure(width, widthMode, height, heightMode) {
    const available = widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : width

    const measured = measure('M', this._metrics, available)

    return { width: available === Infinity ? measured.width : width, height: measured.height }
  }

  _read() {
    return this._multiline ? this._buffer.text : this._native.text
  }

  _write(value) {
    if (this._multiline) this._buffer.text = value
    else this._native.text = value
  }

  // A `GtkTextView` has no placeholder at all, where a `GtkEntry` does. There
  // is nothing to put one in, so nothing is what it gets.
  _placed(placeholder) {
    if (this._multiline === false) this._native.placeholderText = placeholder
  }

  _editing(editable) {
    this._native.editable = editable
  }

  _selected() {
    return this._multiline ? this._buffer.selectionBounds : this._native.selectionBounds
  }

  _select(start, end) {
    if (this._multiline) this._buffer.selectRange(start, end)
    else this._native.selectRegion(start, end)
  }

  // A theme shows an entry's focus by changing the border this style has
  // already replaced, so the ring is drawn as an outline, which GTK keeps out
  // of the box as Yoga has already decided it. The colour is the theme's own.
  _ringed(ring) {
    this._painter.focus({
      outline: ring ? '2px solid @theme_selected_bg_color' : null,
      'outline-offset': ring ? '-2px' : null
    })
  }

  _hinted() {
    this._native.inputPurpose = this._secureTextEntry
      ? INPUT_PURPOSE.PASSWORD
      : PURPOSE[this._keyboardType]

    let hints = CAPITALIZE[this._autoCapitalize]

    hints |= this._autoCorrect ? INPUT_HINTS.SPELLCHECK : INPUT_HINTS.NO_SPELLCHECK

    this._native.inputHints = hints
  }

  _focus() {
    if (this._multiline) this._native.grabFocus()
    else this._native.grabFocusWithoutSelecting()
  }

  _blur() {
    this._native.setRootFocus(null)
  }

  _paint(properties) {
    this._painter.apply(properties)

    if ('textAlign' in properties) {
      const [alignment, justification] = ALIGNMENT[properties.textAlign]

      if (this._multiline) this._native.justification = justification
      else this._native.alignment = alignment
    }

    if (this._inherit(properties)) {
      this._metrics = {
        family: this._own.fontFamily === undefined ? null : this._own.fontFamily,
        size: this._own.fontSize === undefined ? DEFAULT_FONT_SIZE : this._own.fontSize
      }

      this._restyle()

      this._remeasure()
    }
  }

  // The font and the colour are the input's own rather than the painter's six,
  // and GTK paints both through the same stylesheet, so they are declared on
  // the class the painter already gave this widget. CSS spells a font as four
  // properties where Pango spells it as one string, and a stylesheet will not
  // take the string.
  _restyle() {
    const { fontFamily, fontWeight, fontStyle, color } = this._own

    const declarations = {
      // A theme pads an entry, borders it and gives it a minimum size, all of
      // which Yoga has already decided; a caller pads through the style as
      // with a text, and the painter draws the border it asked for.
      padding: 0,
      border: 0,
      'min-width': 0,
      'min-height': 0,
      'font-family': fontFamily === undefined ? null : fontFamily,
      'font-size': `${this._metrics.size}px`,
      'font-weight': style.weight(fontWeight) || 400,
      'font-style': style.italic(fontStyle) ? 'italic' : 'normal',
      color: color === undefined ? null : rgba(style.color(color))
    }

    this._painter.declare(declarations)
  }

  _destroy() {
    this._painter.destroy()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeTextInput }
    }
  }
}
