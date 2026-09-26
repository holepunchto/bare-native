const WinUIControl = require('bare-win-ui/control')
const WinUIFocusManager = require('bare-win-ui/focus-manager')
const WinUIPasswordBox = require('bare-win-ui/password-box')
const WinUISolidColorBrush = require('bare-win-ui/solid-color-brush')
const WinUITextBox = require('bare-win-ui/text-box')
const { constants } = require('bare-yoga')

const NativeTextInputNode = require('../text-input-node')
const Paint = require('../paint/win32')
const style = require('../style')

const { INPUT_SCOPE_NAME, TEXT_ALIGNMENT, TEXT_WRAPPING } = WinUITextBox

// A `PasswordBox` is absent from this because WinUI gives it no text
// alignment, and nothing else it has reaches the text: the content alignment a
// control has is for what a template puts inside it, and a password box's text
// host ignores it. A secure field here draws where the control puts it.
const ALIGNMENT = {
  left: TEXT_ALIGNMENT.LEFT,
  center: TEXT_ALIGNMENT.CENTER,
  right: TEXT_ALIGNMENT.RIGHT,
  justify: TEXT_ALIGNMENT.JUSTIFY,
  natural: TEXT_ALIGNMENT.START
}
const { PASSWORD_REVEAL_MODE } = WinUIPasswordBox

// WinUI asks what a box is for rather than which keyboard to show, as GTK
// does, and has nothing to say about a return key or capitalisation.
const SCOPE = {
  default: INPUT_SCOPE_NAME.DEFAULT,
  'number-pad': INPUT_SCOPE_NAME.DIGITS,
  'decimal-pad': INPUT_SCOPE_NAME.NUMBER,
  numeric: INPUT_SCOPE_NAME.NUMBER,
  'email-address': INPUT_SCOPE_NAME.EMAIL_SMTP_ADDRESS,
  'phone-pad': INPUT_SCOPE_NAME.TELEPHONE_NUMBER,
  url: INPUT_SCOPE_NAME.URL
}

const ENTER = 13

function bytes(value) {
  const { red, green, blue, alpha } = style.color(value)

  return {
    a: Math.round(alpha * 255),
    r: Math.round(red * 255),
    g: Math.round(green * 255),
    b: Math.round(blue * 255)
  }
}

// What a caller replaced with what, worked out from the two texts. WinUI
// reports that the text is changing and hands over the whole of the new one,
// where the other four report the edit itself, so the edit is the difference.
function replacement(before, after) {
  let start = 0

  const shortest = Math.min(before.length, after.length)

  while (start < shortest && before[start] === after[start]) start++

  let tail = 0

  while (
    tail < shortest - start &&
    before[before.length - 1 - tail] === after[after.length - 1 - tail]
  ) {
    tail++
  }

  return { text: after.slice(start, after.length - tail), start, end: before.length - tail }
}

module.exports = class NativeTextInput extends NativeTextInputNode {
  constructor(opts) {
    super(opts)

    this._before = ''
    this._border = 0

    if (this._secureTextEntry) {
      this._native = new WinUIPasswordBox()

      // A box offers to show what it holds, which none of the other four do,
      // and which it has a property for rather than only a template part.
      this._native.passwordRevealMode = PASSWORD_REVEAL_MODE.HIDDEN

      this._native.on('passwordChanged', this._changed.bind(this))
    } else {
      this._native = new WinUITextBox()

      this._native.acceptsReturn = this._multiline

      this._native.textWrapping = this._multiline ? TEXT_WRAPPING.WRAP : TEXT_WRAPPING.NO_WRAP

      this._native.on('textChanging', this._changing.bind(this))
      this._native.on('textChanged', this._changed.bind(this))
      this._native.on('selectionChanged', this._moved.bind(this))

      if (this._multiline === false) {
        this._native.on('keyDown', ({ key }) => {
          if (key === ENTER) this._submitted()
        })
      }
    }

    this._native.on('loaded', this._realised.bind(this))

    this._native.on('gotFocus', this._focused.bind(this))
    this._native.on('lostFocus', this._blurred.bind(this))

    // A control's template pads its content and enforces a minimum of its own,
    // and a node the layout measured has only the room the layout gave it. The
    // minimum is a theme resource, so it is overridden rather than set.
    this._native.padding = 0
    this._native.minWidth = 0
    this._native.minHeight = 0
    this._native.resource('TextControlThemeMinWidth', 0).resource('TextControlThemeMinHeight', 0)

    this._hinted()

    if (this._multiline === false) this._layout.measure = this._onmeasure.bind(this)
  }

  // WinUI alone offers a button to clear a field, and a binding with nothing to
  // say about it is better off without it. It lives in the template, so it can
  // only be reached once the template has been expanded, and its visibility is
  // animated by a visual state, which no value set here would outlast.
  _realised() {
    if (this._secureTextEntry === false) {
      const clear = this._native.templateChild('DeleteButton')

      if (clear !== null) {
        clear.width = 0
        clear.opacity = 0
      }
    }

    // A control measures what its template puts inside it, so what it measured
    // before it had one is worth asking again.
    if (this._multiline === false) {
      this._remeasure()
      this._relayout()
    }
  }

  // A control wants to be no larger than it was told to be, and the layout
  // tells it on every pass, so asking it means letting go of the answer it was
  // given first. Its border goes with them, because the layout adds that to
  // whatever is measured here. The flush that follows gives all three back.
  _onmeasure(width, widthMode, height, heightMode) {
    const available = widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : width

    this._native.width = NaN
    this._native.height = NaN
    this._native.borderThickness = 0

    const { width: measured, height: line } = this._native.measure({
      width: available,
      height: Infinity
    }).desiredSize

    this._native.borderThickness = this._border

    return { width: available === Infinity ? measured : width, height: line }
  }

  _changing() {
    const after = this._read()
    const { text, start, end } = replacement(this._before, after)

    this._before = after

    this._typed(text, start, end)
  }

  _read() {
    return this._secureTextEntry ? this._native.password : this._native.text
  }

  _write(value) {
    this._before = value

    if (this._secureTextEntry) this._native.password = value
    else this._native.text = value
  }

  _placed(placeholder) {
    this._native.placeholderText = placeholder
  }

  _editing(editable) {
    if (this._secureTextEntry) this._native.isEnabled = editable
    else this._native.isReadOnly = editable === false
  }

  // A `PasswordBox` has no selection at all, which is the one thing the other
  // four give for a secure field.
  _selected() {
    if (this._secureTextEntry) return { start: 0, end: 0 }

    const start = this._native.selectionStart

    return { start, end: start + this._native.selectionLength }
  }

  _select(start, end) {
    if (this._secureTextEntry) return

    this._native.selectionStart = start
    this._native.selectionLength = end - start
  }

  // WinUI draws the focus as a thicker bottom border, out of a visual state in
  // the template, and offers no property to turn it off. Overriding the theme
  // resource it reads would take the border with it, because the state
  // replaces the whole thickness rather than adding to it.
  _ringed(ring) {}

  _hinted() {
    if (this._secureTextEntry) return

    // Only when asked. A scope is an object built by hand rather than a value
    // set on the box, and the default one is what a box already has.
    if (this._keyboardType !== 'default') this._native.inputScope = SCOPE[this._keyboardType]

    this._native.isSpellCheckEnabled = this._autoCorrect
  }

  _focus() {
    this._native.focus(WinUIControl.FOCUS_STATE.PROGRAMMATIC)
  }

  // Focus is given and never taken away here, so letting go is moving it on.
  _blur() {
    WinUIFocusManager.tryMoveFocus(this._native, WinUIFocusManager.FOCUS_NAVIGATION_DIRECTION.NEXT)
  }

  // A control paints through its own properties rather than through the
  // composition visuals a canvas needs, which is both what WinUI offers and
  // what a templated control will tolerate: a child visual put on one fights
  // the template it already has, and the window dies when XAML draws it.
  _paint(properties) {
    if ('textAlign' in properties && this._secureTextEntry === false) {
      this._native.textAlignment = ALIGNMENT[properties.textAlign]
    }

    for (const name in properties) {
      const value = properties[name]

      switch (name) {
        case 'backgroundColor':
          this._native.background = new WinUISolidColorBrush({ color: bytes(value) })
          break
        case 'borderColor':
          this._native.borderBrush = new WinUISolidColorBrush({ color: bytes(value) })
          break
        case 'borderWidth':
          this._native.borderThickness = this._border = value
          this._remeasure()
          break
        case 'borderRadius':
          this._native.cornerRadius = value
          break
        case 'opacity':
          this._native.opacity = value
          break
      }
    }

    if ('transform' in properties) Paint.transform(this._native, properties)

    if (this._inherit(properties)) this._remeasure()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeTextInput }
    }
  }
}
