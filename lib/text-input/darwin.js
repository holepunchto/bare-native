const AppKitColor = require('bare-app-kit/color')
const AppKitFont = require('bare-app-kit/font')
const AppKitFontDescriptor = require('bare-app-kit/font-descriptor')
const AppKitScrollView = require('bare-app-kit/scroll-view')
const AppKitSecureTextField = require('bare-app-kit/secure-text-field')
const AppKitText = require('bare-app-kit/text')
const AppKitTextField = require('bare-app-kit/text-field')
const AppKitTextView = require('bare-app-kit/text-view')
const AppKitView = require('bare-app-kit/view')
const { constants } = require('bare-yoga')

const NativeTextInputNode = require('../text-input-node')
const Paint = require('../paint/apple')
const style = require('../style')

const ALIGNMENT = {
  left: AppKitText.ALIGNMENT.LEFT,
  center: AppKitText.ALIGNMENT.CENTER,
  right: AppKitText.ALIGNMENT.RIGHT,
  justify: AppKitText.ALIGNMENT.JUSTIFIED,
  natural: AppKitText.ALIGNMENT.NATURAL
}

// Apple names nine weights and CSS numbers nine, so the two line up.
const WEIGHTS = [
  AppKitFont.WEIGHT.ULTRA_LIGHT,
  AppKitFont.WEIGHT.THIN,
  AppKitFont.WEIGHT.LIGHT,
  AppKitFont.WEIGHT.REGULAR,
  AppKitFont.WEIGHT.MEDIUM,
  AppKitFont.WEIGHT.SEMIBOLD,
  AppKitFont.WEIGHT.BOLD,
  AppKitFont.WEIGHT.HEAVY,
  AppKitFont.WEIGHT.BLACK
]

const DEFAULT_FONT_SIZE = 13

// What a text view is allowed to grow to, which is a size rather than no limit
// because `maxSize` is one.
const LIMIT = 1e7

function font({ fontFamily, fontSize, fontWeight, fontStyle }) {
  const family = fontFamily === undefined ? null : fontFamily
  const size = fontSize === undefined ? DEFAULT_FONT_SIZE : fontSize
  const weight = style.weight(fontWeight) || 400
  const italic = style.italic(fontStyle)

  let resolved =
    family === null
      ? AppKitFont.systemFont(size, WEIGHTS[Math.min(Math.max(Math.round(weight / 100), 1), 9) - 1])
      : AppKitFont.withName(family, size) || AppKitFont.systemFont(size)

  let traits = 0

  if (italic) traits |= AppKitFontDescriptor.TRAIT.ITALIC
  if (family !== null && weight >= 600) traits |= AppKitFontDescriptor.TRAIT.BOLD

  if (traits !== 0) {
    resolved = AppKitFont.withDescriptor(resolved.fontDescriptor.withSymbolicTraits(traits), size)
  }

  return resolved
}

module.exports = class NativeTextInput extends NativeTextInputNode {
  constructor(opts) {
    super(opts)

    this._scroll = null

    // A field is one line that ends its editing on the return key, which is
    // what AppKit gives a control an action for. Text that takes a return key
    // is a text view, the same split UIKit makes.
    if (this._multiline) {
      this._text = new AppKitTextView({ x: 0, y: 0, width: 0, height: 0 })

      // A text view insets its text and holds attributes of its own, neither
      // of which a field does, and a box laid out by Yoga wants neither. It
      // also grows to fit what it holds, where the box it is given is the
      // layout's to decide.
      this._text.textContainerInset = { width: 0, height: 0 }

      // A text container pads every line fragment by five points of its own,
      // which a field does not, so the two shapes would draw their text in
      // different places from the same padding.
      this._text.textContainer.lineFragmentPadding = 0
      this._text.richText = false

      // A text view grows with what it holds and a scroll view is what shows
      // the part of it that fits, which is how AppKit makes a field of more
      // than one line and the only thing that draws a focus ring around one.
      this._text.verticallyResizable = true
      this._text.horizontallyResizable = false
      this._text.minSize = { width: 0, height: 0 }
      this._text.maxSize = { width: LIMIT, height: LIMIT }

      this._scroll = new AppKitScrollView({ x: 0, y: 0, width: 0, height: 0 })

      this._scroll.documentView = this._text
      this._scroll.hasVerticalScroller = true
      this._scroll.autohidesScrollers = true
      this._scroll.drawsBackground = false
      this._scroll.borderType = AppKitScrollView.BORDER_TYPE.NONE
    } else {
      const Field = this._secureTextEntry ? AppKitSecureTextField : AppKitTextField

      this._text = new Field({ x: 0, y: 0, width: 0, height: 0 })

      this._text.bordered = false

      // AppKit's own way of saying one line, and the one that also centres it
      // in a box taller than the line, which is what an input does on the web.
      this._text.usesSingleLineMode = true

      // The action a control sends is what AppKit calls the return key, which
      // is the one thing watching the text cannot tell a caller.
      this._text.on('change', this._submitted.bind(this))

      this._layout.measure = this._onmeasure.bind(this)
    }

    // Neither a field nor a text view insets its text by four edges, so what
    // paints is a view the field sits inside, and the padding is where inside
    // it goes. This is what a `Text` does here and for the same reason.
    this._native = new AppKitView({ x: 0, y: 0, width: 0, height: 0 })

    this._native.flipped = true
    this._native.wantsLayer = true

    this._native.addSubview(this._scroll ?? this._text)

    this._text.drawsBackground = false

    // A bezel is what AppKit hangs a focus ring on, and this field has none,
    // so the ring is asked for rather than inherited. A text view has no ring
    // of its own at all, and the scroll view around it draws that one.
    this._ringed(true)

    this._painter = new Paint(this._native)

    this._text.on('didChange', this._changed.bind(this))

    // Focus travels the responder chain, and losing it is what the editing
    // delegate reports: `didBeginEditing` is editing starting, which is a
    // later thing than a field being focused and never happens if nobody
    // types.
    this._text.on('becomeFirstResponder', this._attached.bind(this))
    this._text.on('didEndEditing', this._blurred.bind(this))

    this._text.on('didChangeSelection', this._moved.bind(this))

    this._text.on('shouldChangeText', ({ location, length, string }) =>
      this._typed(string, location, location + length)
    )
  }

  // A field edits through the window's shared field editor, which exists only
  // while the field is being edited. So a selection and the spelling
  // behaviour can only be set while it is focused, and what was asked for
  // before that is remembered and applied when it is. A text view is its own
  // editor and has one at all times.
  get _editor() {
    return this._multiline ? this._text : this._text.currentEditor
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
    const fitting = this._text.fittingSize

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
    return this._multiline ? this._text.string : this._text.stringValue
  }

  _write(value) {
    if (this._multiline) this._text.string = value
    else this._text.stringValue = value
  }

  // A text view has nothing to show when it is empty, the same as UIKit's.
  _placed(placeholder) {
    if (this._multiline === false) this._text.placeholderString = placeholder
  }

  _editing(editable) {
    this._text.editable = editable
    this._text.selectable = editable
  }

  _ringed(ring) {
    const view = this._scroll ?? this._text

    view.focusRingType = ring
      ? AppKitView.FOCUS_RING_TYPE.EXTERIOR
      : AppKitView.FOCUS_RING_TYPE.NONE
  }

  // AppKit focus is the window's to give, not the view's to take.
  _focus() {
    const window = this._native.window

    if (window !== null) window.makeFirstResponder(this._text)
  }

  _blur() {
    const window = this._native.window

    if (window !== null) window.makeFirstResponder(null)
  }

  // The box paints and the field is placed inside it at the padding, which is
  // also what tells the border layer the box it is drawing.
  _resized(width, height) {
    const { top, right, bottom, left } = this._padding

    const box = {
      x: left,
      y: top,
      width: Math.max(0, width - left - right),
      height: Math.max(0, height - top - bottom)
    }

    if (this._scroll === null) this._text.frame = box
    else {
      this._scroll.frame = box

      // The document view is as wide as what shows it and as tall as what it
      // holds, which is what there is to scroll.
      this._text.frame = { x: 0, y: 0, ...this._scroll.contentSize }
    }

    this._painter.resize(width, height)
  }

  _untransform() {
    this._painter.untransform()
  }

  _paint(properties) {
    this._painter.apply(properties)

    if (this._inherit(properties)) {
      this._text.font = font(this._own)

      this._text.textColor =
        this._own.color === undefined ? AppKitColor.labelColor : rgb(this._own.color)

      this._remeasure()
    }

    if ('textAlign' in properties) this._text.alignment = ALIGNMENT[properties.textAlign]
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

  return AppKitColor.rgb(red, green, blue, alpha)
}
