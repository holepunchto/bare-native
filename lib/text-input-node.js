const NativeControlNode = require('./control-node')
const style = require('./style')
const hints = require('./text-input-hints')

// A text input is the first primitive whose content belongs to the caller and
// to the person typing at the same time, and that is most of what makes it the
// hard one. Everything here is about keeping those two out of each other's
// way; what the text looks like and where the caret goes are the platform's.
module.exports = exports = class NativeTextInputNode extends NativeControlNode {
  // Every toolkit has a class per shape rather than a property, as it does for
  // a scroll view's axis, so this is settled when the input is made. Changing
  // it raises rather than doing nothing; the caller keys the element instead.
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

  // Secure entry is a different class on two toolkits, as a shape is on every
  // one of them, so it is settled here for the same reason.
  get secureTextEntry() {
    return this._secureTextEntry
  }

  // Read back from the field rather than remembered, because the person typing
  // changes it without telling anyone above this.
  get value() {
    return this._read()
  }

  // A controlled input writes its value back on every keystroke, and writing
  // it into the field would move the insertion point and drop whatever an
  // input method had in progress. So the field is told only when the two
  // actually disagree, which is the one thing a text input has to get right.
  set value(value) {
    const text = value === undefined || value === null ? '' : String(value)

    if (this._read() === text) return

    // Android tells its watchers about a write whoever made it, where the
    // Apple toolkits tell a delegate only about the person typing. So what a
    // caller does to the field is fenced off here rather than in the one
    // platform file that needs it, because the rule is the same everywhere: a
    // caller's own write is not a change, and reporting it to a controlled
    // input is a loop.
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

  // Where the caret is, as two offsets into the text. Read from the field
  // rather than remembered, because moving it is the other thing the person
  // typing does without telling anyone.
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

  // Only a single line field measures itself; a multiline one takes the box
  // the layout hands it, and Yoga refuses to dirty a node it does not measure.
  _remeasure() {
    if (this._multiline === false) this._layout.markDirty()
  }

  get _paintable() {
    return style.INPUT
  }

  // Raised by the platform when the person typing changed the text, never when
  // the caller did: a caller already knows.
  _changed() {
    if (this._writing) return

    this.emit('change', this._read())
  }

  _moved() {
    if (this._writing) return

    this.emit('selectionchange', this._selected())
  }

  // What is about to replace what, which is the one shape all five report and
  // the one a caller can act on: a key is not what an input method delivers.
  _typed(text, start, end) {
    if (this._writing) return

    this.emit('keypress', { text, start, end })
  }

  // A selection the caller asked for is written again here, because focus is
  // where a toolkit is most likely to have moved the caret itself: UIKit puts
  // it at the end and AppKit has nowhere to keep it until there is a field
  // editor. A field nobody asked anything of is left alone.
  _focused() {
    this.emit('focus')

    const selection = this._selection

    if (selection !== null) this._select(selection.start, selection.end)
  }

  _blurred() {
    this.emit('blur')
  }

  // Enter in a single line field, which is the one thing a caller wants that
  // no amount of watching the text can tell it.
  _submitted() {
    this.emit('submit', this._read())
  }

  // The style its one font is resolved from. A text input has no runs, so
  // there is nothing to inherit it, only the field itself.
  _inherit(properties) {
    return style.inherit(this._own, properties)
  }

  // The platform hooks: what the field holds, and the four things that can be
  // done to it.

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

  // Told whenever any of the four keyboard hints moved, because a platform
  // that packs them into one value has to write all four at once.
  _hinted() {}

  _focus() {}

  _blur() {}
}
