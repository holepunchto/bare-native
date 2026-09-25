const AppKit = require('bare-app-kit')
const { constants } = require('bare-yoga')

const NativeTextInputNode = require('../text-input-node')
const Paint = require('../paint/apple')
const style = require('../style')

const { Color, Font, FontDescriptor } = AppKit

const ALIGNMENT = {
  left: AppKit.Text.ALIGNMENT.LEFT,
  center: AppKit.Text.ALIGNMENT.CENTER,
  right: AppKit.Text.ALIGNMENT.RIGHT,
  justify: AppKit.Text.ALIGNMENT.JUSTIFIED,
  natural: AppKit.Text.ALIGNMENT.NATURAL
}

// Apple names nine weights and CSS numbers nine, so the two line up.
const WEIGHTS = [
  Font.WEIGHT.ULTRA_LIGHT,
  Font.WEIGHT.THIN,
  Font.WEIGHT.LIGHT,
  Font.WEIGHT.REGULAR,
  Font.WEIGHT.MEDIUM,
  Font.WEIGHT.SEMIBOLD,
  Font.WEIGHT.BOLD,
  Font.WEIGHT.HEAVY,
  Font.WEIGHT.BLACK
]

const DEFAULT_FONT_SIZE = 13

function font({ fontFamily, fontSize, fontWeight, fontStyle }) {
  const family = fontFamily === undefined ? null : fontFamily
  const size = fontSize === undefined ? DEFAULT_FONT_SIZE : fontSize
  const weight = style.weight(fontWeight) || 400
  const italic = style.italic(fontStyle)

  let resolved =
    family === null
      ? Font.systemFont(size, WEIGHTS[Math.min(Math.max(Math.round(weight / 100), 1), 9) - 1])
      : Font.withName(family, size) || Font.systemFont(size)

  let traits = 0

  if (italic) traits |= FontDescriptor.TRAIT.ITALIC
  if (family !== null && weight >= 600) traits |= FontDescriptor.TRAIT.BOLD

  if (traits !== 0) {
    resolved = Font.withDescriptor(resolved.fontDescriptor.withSymbolicTraits(traits), size)
  }

  return resolved
}

module.exports = class NativeTextInput extends NativeTextInputNode {
  constructor(opts) {
    super(opts)

    // A field is one line that ends its editing on the return key, which is
    // what AppKit gives a control an action for. Text that takes a return key
    // is a text view, the same split UIKit makes.
    if (this._multiline) {
      this._native = new AppKit.TextView({ x: 0, y: 0, width: 0, height: 0 })

      // A text view insets its text and holds attributes of its own, neither
      // of which a field does, and a box laid out by Yoga wants neither. It
      // also grows to fit what it holds, where the box it is given is the
      // layout's to decide.
      this._native.textContainerInset = { width: 0, height: 0 }
      this._native.richText = false
      this._native.verticallyResizable = false
      this._native.horizontallyResizable = false
    } else {
      const Field = this._secureTextEntry ? AppKit.SecureTextField : AppKit.TextField

      this._native = new Field({ x: 0, y: 0, width: 0, height: 0 })

      this._native.bordered = false
      this._native.maximumNumberOfLines = 1

      // The action a control sends is what AppKit calls the return key, which
      // is the one thing watching the text cannot tell a caller.
      this._native.on('change', this._submitted.bind(this))

      this._layout.measure = this._onmeasure.bind(this)
    }

    this._native.wantsLayer = true
    this._native.drawsBackground = false

    this._painter = new Paint(this._native)

    this._native.on('didChange', this._changed.bind(this))

    // Focus travels the responder chain, and losing it is what the editing
    // delegate reports: `didBeginEditing` is editing starting, which is a
    // later thing than a field being focused and never happens if nobody
    // types.
    this._native.on('becomeFirstResponder', this._attached.bind(this))
    this._native.on('didEndEditing', this._blurred.bind(this))

    this._native.on('didChangeSelection', this._moved.bind(this))

    this._native.on('shouldChangeText', ({ location, length, string }) =>
      this._typed(string, location, location + length)
    )
  }

  // A field edits through the window's shared field editor, which exists only
  // while the field is being edited. So a selection and the spelling
  // behaviour can only be set while it is focused, and what was asked for
  // before that is remembered and applied when it is. A text view is its own
  // editor and has one at all times.
  get _editor() {
    return this._multiline ? this._native : this._native.currentEditor
  }

  get layer() {
    return this._painter.layer
  }

  // The field editor arrives with focus, so what was asked of it before there
  // was one is written now. The selection is the shared half's to restate.
  _attached() {
    this._focused()

    this._hinted()
  }

  // A field is as tall as the line it draws plus what the cell insets it by,
  // and as wide as it is allowed to be: nothing about the text it holds should
  // move the box a caller laid out.
  _onmeasure(width, widthMode, height, heightMode) {
    const fitting = this._native.fittingSize

    return {
      width: widthMode === constants.MEASURE_MODE.UNDEFINED ? fitting.width : width,
      height: fitting.height
    }
  }

  _selected() {
    const editor = this._editor

    if (editor === null) {
      const remembered = this._selection

      return remembered === null ? { start: 0, end: 0 } : { ...remembered }
    }

    const { location, length } = editor.selectedRange

    return { start: location, end: location + length }
  }

  _select(start, end) {
    const editor = this._editor

    if (editor !== null) editor.selectedRange = { location: start, length: end - start }
  }

  // Nothing on a field carries these; they belong to the text object it edits
  // through, so they are written whenever there is one to write them to.
  _hinted() {
    const editor = this._editor

    if (editor === null) return

    editor.continuousSpellCheckingEnabled = this._autoCorrect
    editor.automaticSpellingCorrectionEnabled = this._autoCorrect
  }

  _read() {
    return this._multiline ? this._native.string : this._native.stringValue
  }

  _write(value) {
    if (this._multiline) this._native.string = value
    else this._native.stringValue = value
  }

  // A text view has nothing to show when it is empty, the same as UIKit's.
  _placed(placeholder) {
    if (this._multiline === false) this._native.placeholderString = placeholder
  }

  _editing(editable) {
    this._native.editable = editable
    this._native.selectable = editable
  }

  // AppKit focus is the window's to give, not the view's to take.
  _focus() {
    const window = this._native.window

    if (window !== null) window.makeFirstResponder(this._native)
  }

  _blur() {
    const window = this._native.window

    if (window !== null) window.makeFirstResponder(null)
  }

  _paint(properties) {
    this._painter.apply(properties)

    if (this._inherit(properties)) {
      this._native.font = font(this._own)

      this._native.textColor =
        this._own.color === undefined ? Color.labelColor : rgb(this._own.color)

      this._remeasure()
    }

    if ('textAlign' in properties) this._native.alignment = ALIGNMENT[properties.textAlign]
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

  return Color.rgb(red, green, blue, alpha)
}
