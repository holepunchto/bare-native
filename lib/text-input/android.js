const NDKActivity = require('bare-ndk/activity')
const NDKEditField = require('bare-ndk/edit-field')
const NDKTextView = require('bare-ndk/text-view')
const NDKTypeface = require('bare-ndk/typeface')
const NDKWindowInsets = require('bare-ndk/window-insets')
const { measure } = require('bare-ndk/text')
const { constants } = require('bare-yoga')

const NativeTextInputNode = require('../text-input-node')
const Paint = require('../paint/android')
const style = require('../style')
const { px, dp } = require('../metrics/android')

const { INPUT_TYPE, IME_OPTIONS } = NDKEditField
const { GRAVITY } = NDKTextView
const { IME } = NDKWindowInsets.TYPE

const ALIGNMENT = {
  left: GRAVITY.LEFT,
  center: GRAVITY.CENTER_HORIZONTAL,
  right: GRAVITY.RIGHT,
  justify: GRAVITY.START,
  natural: GRAVITY.START
}

// Android packs all four hints into one set of flags, so they are written together.
const KEYBOARD = {
  default: INPUT_TYPE.CLASS_TEXT,
  'number-pad': INPUT_TYPE.CLASS_NUMBER,
  'decimal-pad': INPUT_TYPE.CLASS_NUMBER | INPUT_TYPE.NUMBER_FLAG_DECIMAL,
  numeric: INPUT_TYPE.CLASS_NUMBER | INPUT_TYPE.NUMBER_FLAG_DECIMAL,
  'email-address': INPUT_TYPE.CLASS_TEXT | INPUT_TYPE.TEXT_VARIATION_EMAIL_ADDRESS,
  'phone-pad': INPUT_TYPE.CLASS_PHONE,
  url: INPUT_TYPE.CLASS_TEXT | INPUT_TYPE.TEXT_VARIATION_URI
}

const CAPITALIZE = {
  none: 0,
  sentences: INPUT_TYPE.TEXT_FLAG_CAP_SENTENCES,
  words: INPUT_TYPE.TEXT_FLAG_CAP_WORDS,
  characters: INPUT_TYPE.TEXT_FLAG_CAP_CHARACTERS
}

const RETURN_KEY = {
  default: IME_OPTIONS.ACTION_UNSPECIFIED,
  done: IME_OPTIONS.ACTION_DONE,
  go: IME_OPTIONS.ACTION_GO,
  next: IME_OPTIONS.ACTION_NEXT,
  search: IME_OPTIONS.ACTION_SEARCH,
  send: IME_OPTIONS.ACTION_SEND
}

let defaults = null

module.exports = class NativeTextInput extends NativeTextInputNode {
  constructor(opts) {
    super(opts)

    this._native = new NDKEditField()

    // Replacing the background keeps the default drawable's padding, which
    // leaves no room for the text in a one line box. Yoga owns the padding.
    this._native.setPadding(0, 0, 0, 0)

    // Centre single line text and start multiline text at the top, as on the web.
    this._native.gravity = this._vertical | GRAVITY.START

    if (defaults === null) {
      defaults = { size: this._native.textSize, typeface: this._native.typeface }
    }

    this._painter = new Paint(this._native)

    this._native.on('changed', this._changed.bind(this))
    this._native.on('selectionChanged', (start, end) => this._moved())
    this._native.on('focusChanged', (focused) => (focused ? this._focused() : this._blurred()))
    this._native.on('replacing', (text, start, end) => this._typed(text, start, end))

    // The software keyboard's return key arrives as an editor action.
    if (this._multiline === false) {
      this._native.on('action', () => this._submitted())
    }

    this._ringed(true)

    this._size = defaults.size

    this._hinted()

    if (this._multiline === false) this._layout.measure = this._onmeasure.bind(this)
  }

  _onmeasure(width, widthMode, height, heightMode) {
    const available = widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : px(width)

    const measured = measure('M', { size: this._size }, available)

    return {
      width: available === Infinity ? dp(measured.width) : width,
      height: dp(measured.height)
    }
  }

  _read() {
    return this._native.text
  }

  _write(value) {
    this._native.text = value
  }

  _placed(placeholder) {
    this._native.hint = placeholder
  }

  _editing(editable) {
    this._native.enabled = editable
  }

  _selected() {
    return this._native.selection
  }

  _select(start, end) {
    this._native.selection = { start, end }
  }

  // Android draws focus through the background's focused state, which the
  // painter replaces, so the theme accent is drawn as a stroke while focused.
  _ringed(ring) {
    this._ring = ring

    if (ring === false) this._painter.focus(null)
  }

  _focused() {
    if (this._ring) this._painter.focus({ width: 2, color: NDKActivity.themeColor('colorAccent') })

    super._focused()
  }

  _blurred() {
    this._painter.focus(null)

    super._blurred()
  }

  _hinted() {
    let type = KEYBOARD[this._keyboardType]

    // The class is the low four bits rather than a flag, so it must be masked.
    // The remaining flags only apply to text.
    if ((type & INPUT_TYPE.MASK_CLASS) === INPUT_TYPE.CLASS_TEXT) {
      type |= CAPITALIZE[this._autoCapitalize]

      if (this._multiline) type |= INPUT_TYPE.TEXT_FLAG_MULTI_LINE
      if (this._secureTextEntry) type |= INPUT_TYPE.TEXT_VARIATION_PASSWORD
    }

    if (this._autoCorrect === false) type |= INPUT_TYPE.TEXT_FLAG_NO_SUGGESTIONS

    this._native.inputType = type
    this._native.imeOptions = RETURN_KEY[this._returnKeyType]
  }

  // Android only shows the keyboard for a field focused while its window has
  // focus, which it lacks at startup.
  _focus() {
    this._native.requestFocus()

    const controller = this._native.windowInsetsController

    if (controller !== null) controller.show(IME)
  }

  _blur() {
    this._native.clearFocus()
  }

  _paint(properties) {
    this._painter.apply(properties)

    if (this._inherit(properties)) {
      this._size = this._own.fontSize === undefined ? defaults.size : px(this._own.fontSize)

      this._native.textSize = this._size

      this._native.typeface = typeface(this._own)

      // Setting a typeface drops the password transformation, so restore it.
      if (this._secureTextEntry) this._hinted()

      if (this._own.color !== undefined) this._native.textColor = argb(style.color(this._own.color))

      this._remeasure()
    }

    if ('textAlign' in properties) {
      this._native.gravity = this._vertical | ALIGNMENT[properties.textAlign]
    }
  }

  get _vertical() {
    return this._multiline ? GRAVITY.TOP : GRAVITY.CENTER_VERTICAL
  }

  // An `EditText` pads its own text.
  _resized(width, height) {
    const { top, right, bottom, left } = this._padding

    this._native.setPadding(px(left), px(top), px(right), px(bottom))
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeTextInput }
    }
  }
}

function typeface({ fontFamily, fontWeight, fontStyle }) {
  const family = fontFamily === undefined ? null : fontFamily
  const weight = style.weight(fontWeight) || 400
  const italic = style.italic(fontStyle)

  const base =
    family === null ? defaults.typeface : NDKTypeface.create(family, NDKTypeface.STYLE.NORMAL)

  return NDKTypeface.create(base, weight, italic)
}

function argb({ red, green, blue, alpha }) {
  return (
    (Math.round(alpha * 255) << 24) |
    (Math.round(red * 255) << 16) |
    (Math.round(green * 255) << 8) |
    Math.round(blue * 255)
  )
}
