const UIKitColor = require('bare-ui-kit/color')
const UIKitFont = require('bare-ui-kit/font')
const UIKitFontDescriptor = require('bare-ui-kit/font-descriptor')
const UIKitLabel = require('bare-ui-kit/label')
const UIKitTextField = require('bare-ui-kit/text-field')
const UIKitTextView = require('bare-ui-kit/text-view')
const { constants } = require('bare-yoga')

const NativeTextInputNode = require('../text-input-node')
const Paint = require('../paint/apple')
const style = require('../style')

const ALIGNMENT = {
  left: UIKitLabel.ALIGNMENT.LEFT,
  center: UIKitLabel.ALIGNMENT.CENTER,
  right: UIKitLabel.ALIGNMENT.RIGHT,
  justify: UIKitLabel.ALIGNMENT.JUSTIFIED,
  natural: UIKitLabel.ALIGNMENT.NATURAL
}

const WEIGHTS = [
  UIKitFont.WEIGHT.ULTRA_LIGHT,
  UIKitFont.WEIGHT.THIN,
  UIKitFont.WEIGHT.LIGHT,
  UIKitFont.WEIGHT.REGULAR,
  UIKitFont.WEIGHT.MEDIUM,
  UIKitFont.WEIGHT.SEMIBOLD,
  UIKitFont.WEIGHT.BOLD,
  UIKitFont.WEIGHT.HEAVY,
  UIKitFont.WEIGHT.BLACK
]

const DEFAULT_FONT_SIZE = 17

const KEYBOARD = {
  default: UIKitTextField.KEYBOARD_TYPE.DEFAULT,
  'number-pad': UIKitTextField.KEYBOARD_TYPE.NUMBER_PAD,
  'decimal-pad': UIKitTextField.KEYBOARD_TYPE.DECIMAL_PAD,
  numeric: UIKitTextField.KEYBOARD_TYPE.NUMBERS_AND_PUNCTUATION,
  'email-address': UIKitTextField.KEYBOARD_TYPE.EMAIL_ADDRESS,
  'phone-pad': UIKitTextField.KEYBOARD_TYPE.PHONE_PAD,
  url: UIKitTextField.KEYBOARD_TYPE.URL
}

const RETURN_KEY = {
  default: UIKitTextField.RETURN_KEY_TYPE.DEFAULT,
  done: UIKitTextField.RETURN_KEY_TYPE.DONE,
  go: UIKitTextField.RETURN_KEY_TYPE.GO,
  next: UIKitTextField.RETURN_KEY_TYPE.NEXT,
  search: UIKitTextField.RETURN_KEY_TYPE.SEARCH,
  send: UIKitTextField.RETURN_KEY_TYPE.SEND
}

const CAPITALIZE = {
  none: UIKitTextField.AUTOCAPITALIZATION_TYPE.NONE,
  sentences: UIKitTextField.AUTOCAPITALIZATION_TYPE.SENTENCES,
  words: UIKitTextField.AUTOCAPITALIZATION_TYPE.WORDS,
  characters: UIKitTextField.AUTOCAPITALIZATION_TYPE.ALL_CHARACTERS
}

function font({ fontFamily, fontSize, fontWeight, fontStyle }) {
  const family = fontFamily === undefined ? null : fontFamily
  const size = fontSize === undefined ? DEFAULT_FONT_SIZE : fontSize
  const weight = style.weight(fontWeight) || 400
  const italic = style.italic(fontStyle)

  let resolved =
    family === null
      ? UIKitFont.systemFont(size, WEIGHTS[Math.min(Math.max(Math.round(weight / 100), 1), 9) - 1])
      : UIKitFont.withName(family, size) || UIKitFont.systemFont(size)

  let traits = 0

  if (italic) traits |= UIKitFontDescriptor.TRAIT.ITALIC
  if (family !== null && weight >= 600) traits |= UIKitFontDescriptor.TRAIT.BOLD

  if (traits !== 0) {
    resolved = UIKitFont.withDescriptor(resolved.fontDescriptor.withSymbolicTraits(traits), size)
  }

  return resolved
}

// UIKit has a class per shape as AppKit does, and unlike AppKit it keeps the
// selection and the keyboard's behaviour on the control itself, so nothing
// here waits for focus.
module.exports = class NativeTextInput extends NativeTextInputNode {
  constructor(opts) {
    super(opts)

    this._native = this._multiline
      ? new UIKitTextView({ x: 0, y: 0, width: 0, height: 0 })
      : new UIKitTextField({ x: 0, y: 0, width: 0, height: 0 })

    if (this._multiline) {
      // Yoga owns the box, so the view does not scroll itself out of it.
      this._native.scrollEnabled = true
    } else {
      this._native.secureTextEntry = this._secureTextEntry
    }

    this._painter = new Paint(this._native)

    this._native.on('didBeginEditing', this._focused.bind(this))
    this._native.on('didEndEditing', this._blurred.bind(this))
    this._native.on('didChange', this._changed.bind(this))
    this._native.on('didChangeSelection', this._moved.bind(this))

    const replaced = ({ location, length, string }) =>
      this._typed(string, location, location + length)

    if (this._multiline) {
      this._native.on('shouldChangeText', replaced)
    } else {
      this._native.on('shouldChangeCharacters', replaced)
      this._native.on('shouldReturn', () => this._submitted())
    }

    if (this._multiline === false) this._layout.measure = this._onmeasure.bind(this)
  }

  get layer() {
    return this._painter.layer
  }

  // The line the font draws rather than what `sizeThatFits` reports, which
  // measures the glyphs a field happens to hold and so makes a field with a
  // descender in it taller than an empty one.
  _onmeasure(width, widthMode, height, heightMode) {
    const available = widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : width

    const fitting = this._native.sizeThatFits(available, Infinity)

    return {
      width: available === Infinity ? fitting.width : width,
      height: Math.ceil(font(this._own).lineHeight)
    }
  }

  _read() {
    return this._native.text || ''
  }

  _write(value) {
    this._native.text = value
  }

  _placed(placeholder) {
    if (this._multiline === false) this._native.placeholder = placeholder
  }

  _editing(editable) {
    if (this._multiline) this._native.editable = editable
    else this._native.enabled = editable
  }

  _selected() {
    const { location, length } = this._native.selectedRange

    return { start: location, end: location + length }
  }

  _select(start, end) {
    this._native.selectedRange = { location: start, length: end - start }
  }

  // UIKit indicates the focus with the caret and the keyboard it raises, and
  // draws a ring only for the focus system a keyboard or a pointer drives,
  // which it does without being asked. There is nothing here to turn on.
  _ringed(ring) {}

  _hinted() {
    this._native.keyboardType = KEYBOARD[this._keyboardType]
    this._native.returnKeyType = RETURN_KEY[this._returnKeyType]
    this._native.autocapitalizationType = CAPITALIZE[this._autoCapitalize]

    this._native.autocorrectionType = this._autoCorrect
      ? UIKitTextField.AUTOCORRECTION_TYPE.YES
      : UIKitTextField.AUTOCORRECTION_TYPE.NO
  }

  _focus() {
    this._native.becomeFirstResponder()
  }

  _blur() {
    this._native.resignFirstResponder()
  }

  // A border is a layer of its own beneath the content, so what paints has to
  // be told the box it is drawing.
  _resized(width, height) {
    this._painter.resize(width, height)
  }

  _untransform() {
    this._painter.untransform()
  }

  _paint(properties) {
    this._painter.apply(properties)

    if (this._inherit(properties)) {
      this._native.font = font(this._own)

      this._native.textColor =
        this._own.color === undefined ? UIKitColor.labelColor : rgb(this._own.color)

      this._remeasure()
    }

    if ('textAlign' in properties) this._native.textAlignment = ALIGNMENT[properties.textAlign]
  }

  _destroy() {
    this._native.removeFromSuperview()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeTextInput }
    }
  }
}

function rgb(color) {
  const { red, green, blue, alpha } = style.color(color)

  return UIKitColor.rgb(red, green, blue, alpha)
}
