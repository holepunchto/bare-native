const { constants } = require('bare-yoga')

const NativeControlNode = require('./control-node')
const style = require('./style')
const hints = require('./text-input-hints')

module.exports = exports = class NativeTextInputNode extends NativeControlNode {
  // Toolkits use a separate class per shape, so it is fixed at construction.
  constructor(opts = {}) {
    super()

    const { multiline = false, secureTextEntry = false } = opts

    if (multiline && secureTextEntry) {
      throw new Error('A text input cannot be both multiline and secure')
    }

    this._multiline = multiline
    this._secureTextEntry = secureTextEntry
    this._placeholder = ''
    this._editable = true
    this._selection = null
    this._writing = false

    this._keyboardType = 'default'
    this._returnKeyType = 'default'
    this._autoCapitalize = 'sentences'
    this._autoCorrect = true

    this._own = {}
  }

  get multiline() {
    return this._multiline
  }

  // Secure entry is a separate class on some toolkits, so it is fixed too.
  get secureTextEntry() {
    return this._secureTextEntry
  }

  // Read from the field, since the user edits it directly.
  get value() {
    return this._read()
  }

  // A controlled input writes back on every keystroke, and writing to the field
  // moves the caret and drops any input method composition, so only write when
  // the value differs.
  set value(value) {
    const text = value === undefined || value === null ? '' : String(value)

    if (this._read() === text) return

    // Some platforms, like Android, report writes from code as changes. Fence
    // them off so a controlled input does not loop.
    this._writing = true

    try {
      this._write(text)
    } finally {
      this._writing = false
    }

    this._remeasure()
  }

  get placeholder() {
    return this._placeholder
  }

  set placeholder(value) {
    this._placeholder = value === undefined || value === null ? '' : String(value)

    this._placed(this._placeholder)
  }

  get editable() {
    return this._editable
  }

  set editable(value) {
    this._editable = value !== false

    this._editing(this._editable)
  }

  // Read from the field, since the user moves the caret directly.
  get selection() {
    return this._selected()
  }

  set selection(value) {
    if (value === undefined || value === null) {
      this._selection = null

      return
    }

    const { start = 0, end = start } = value

    this._selection = { start, end }

    this._select(start, end)
  }

  get keyboardType() {
    return this._keyboardType
  }

  set keyboardType(value) {
    this._keyboardType = hints.keyboardType(value)

    this._hinted()
  }

  get returnKeyType() {
    return this._returnKeyType
  }

  set returnKeyType(value) {
    this._returnKeyType = hints.returnKeyType(value)

    this._hinted()
  }

  get autoCapitalize() {
    return this._autoCapitalize
  }

  set autoCapitalize(value) {
    this._autoCapitalize = hints.autoCapitalize(value)

    this._hinted()
  }

  get autoCorrect() {
    return this._autoCorrect
  }

  set autoCorrect(value) {
    this._autoCorrect = hints.autoCorrect(value)

    this._hinted()
  }

  focus() {
    this._focus()

    return this
  }

  blur() {
    this._blur()

    return this
  }

  _remeasure() {
    if (this._multiline === false) super._remeasure()
  }

  // A field has no children for Yoga to inset, so the platform insets the text
  // by the resolved padding instead.
  get _padding() {
    return {
      top: this._layout.layoutPadding(constants.EDGE.TOP),
      right: this._layout.layoutPadding(constants.EDGE.RIGHT),
      bottom: this._layout.layoutPadding(constants.EDGE.BOTTOM),
      left: this._layout.layoutPadding(constants.EDGE.LEFT)
    }
  }

  get _paintable() {
    return style.INPUT
  }

  _changed() {
    if (this._writing) return

    this.emit('change', this._read())
  }

  _moved() {
    if (this._writing) return

    this.emit('selectionchange', this._selected())
  }

  // Reported as a text replacement rather than a key, since input methods do
  // not deliver keys.
  _typed(text, start, end) {
    if (this._writing) return

    this.emit('keypress', { text, start, end })
  }

  // Toolkits may move the caret on focus, so a requested selection is restored.
  // UIKit moves it to the end and AppKit has no field editor before focus.
  _focused() {
    this.emit('focus')

    const selection = this._selection

    if (selection !== null) this._select(selection.start, selection.end)
  }

  _blurred() {
    this.emit('blur')
  }

  _submitted() {
    this.emit('submit', this._read())
  }

  // A text input has no runs, so its font comes from its own style only.
  _inherit(properties) {
    return style.inherit(this._own, properties)
  }

  _read() {
    throw new Error(`${this.constructor.name} does not implement _read`)
  }

  _write(value) {
    throw new Error(`${this.constructor.name} does not implement _write`)
  }

  _placed(placeholder) {}

  _editing(editable) {}

  _selected() {
    return { start: 0, end: 0 }
  }

  _select(start, end) {}

  // Called for any hint change, since some platforms write all four at once.
  _hinted() {}

  _focus() {}

  _blur() {}
}
