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
  left: AppKitText.TEXT_ALIGNMENT.LEFT,
  center: AppKitText.TEXT_ALIGNMENT.CENTER,
  right: AppKitText.TEXT_ALIGNMENT.RIGHT,
  justify: AppKitText.TEXT_ALIGNMENT.JUSTIFIED,
  natural: AppKitText.TEXT_ALIGNMENT.NATURAL
}

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

// `maxSize` requires a finite size.
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

  if (italic) traits |= AppKitFontDescriptor.SYMBOLIC_TRAITS.ITALIC
  if (family !== null && weight >= 600) traits |= AppKitFontDescriptor.SYMBOLIC_TRAITS.BOLD

  if (traits !== 0) {
    resolved = AppKitFont.withDescriptor(resolved.fontDescriptor.withSymbolicTraits(traits), size)
  }

  return resolved
}

module.exports = class NativeTextInput extends NativeTextInputNode {
  constructor(opts) {
    super(opts)

    this._scroll = null

    if (this._multiline) {
      this._text = new AppKitTextView({ x: 0, y: 0, width: 0, height: 0 })

      this._text.textContainerInset = { width: 0, height: 0 }

      // Match the field, which has no line fragment padding.
      this._text.textContainer.lineFragmentPadding = 0
      this._text.richText = false

      // AppKit needs a scroll view for multiline text, and only the scroll view
      // draws a focus ring.
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

      // Also centres the line vertically, as on the web.
      this._text.usesSingleLineMode = true

      // The control action fires on return.
      this._text.on('change', this._submitted.bind(this))

      this._layout.measure = this._onmeasure.bind(this)
    }

    // Neither control can inset its text on four edges, so it sits inside a
    // painted view at the padding, as a `Text` does.
    this._native = new AppKitView({ x: 0, y: 0, width: 0, height: 0 })

    this._native.flipped = true
    this._native.wantsLayer = true

    this._native.addSubview(this._scroll ?? this._text)

    this._text.drawsBackground = false

    // Without a bezel the field has no focus ring, so request one. A text view's
    // ring is drawn by its scroll view.
    this._ringed(true)

    this._painter = new Paint(this._native)

    this._text.on('didChange', this._changed.bind(this))

    // `didBeginEditing` only fires once the user types, so focus is tracked
    // through the responder chain instead.
    this._text.on('becomeFirstResponder', this._attached.bind(this))
    this._text.on('didEndEditing', this._blurred.bind(this))

    this._text.on('didChangeSelection', this._moved.bind(this))

    this._text.on('shouldChangeText', ({ location, length, string }) =>
      this._typed(string, location, location + length)
    )
  }

  // A field edits through the window's shared field editor, which only exists
  // while focused. A text view is its own editor.
  get _editor() {
    return this._multiline ? this._text : this._text.currentEditor
  }

  // Apply what was requested before the field editor existed. The base class
  // restores the selection.
  _attached() {
    this._focused()

    this._hinted()
  }

  // Height is the line plus the cell insets. The text never affects the width.
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

  // These live on the field editor, so they are written whenever one exists.
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

  // A text view has no placeholder, as in UIKit.
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

  _focus() {
    const window = this._native.window

    if (window !== null) window.makeFirstResponder(this._text)
  }

  _blur() {
    const window = this._native.window

    if (window !== null) window.makeFirstResponder(null)
  }

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
