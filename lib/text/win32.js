const WinUIFontFamily = require('bare-win-ui/font-family')
const WinUIRun = require('bare-win-ui/run')
const WinUISolidColorBrush = require('bare-win-ui/solid-color-brush')
const WinUICanvas = require('bare-win-ui/canvas')
const WinUITextBlock = require('bare-win-ui/text-block')
const { constants } = require('bare-yoga')

const { TEXT_TRIMMING } = WinUITextBlock

const NativeTextNode = require('../text-node')
const Paint = require('../paint/win32')
const style = require('../style')

const ALIGNMENT = {
  left: WinUITextBlock.TEXT_ALIGNMENT.LEFT,
  center: WinUITextBlock.TEXT_ALIGNMENT.CENTER,
  right: WinUITextBlock.TEXT_ALIGNMENT.RIGHT,
  justify: WinUITextBlock.TEXT_ALIGNMENT.JUSTIFY,
  natural: WinUITextBlock.TEXT_ALIGNMENT.START
}

const DEFAULT_FONT_SIZE = 14

const CACHE_LIMIT = 4096

const families = new Map()

function family(name) {
  let resolved = families.get(name)

  if (resolved === undefined) {
    resolved = new WinUIFontFamily({ familyName: name })

    if (families.size === CACHE_LIMIT) families.delete(families.keys().next().value)

    families.set(name, resolved)
  }

  return resolved
}

module.exports = class NativeText extends NativeTextNode {
  constructor(text = '') {
    super(text)

    // A `TextBlock` has no background or border, so it sits in a canvas that
    // draws them.
    this._native = new WinUICanvas()

    this._text = new WinUITextBlock()
    this._text.textWrapping = WinUITextBlock.TEXT_WRAPPING.WRAP

    this._native.children.insertAt(0, this._text)

    this._painter = new Paint(this._native, { panel: true })

    this._defaults = {
      fontFamily: this._text.fontFamily,
      foreground: this._text.foreground
    }

    this._inlines = this._text.inlines

    this._layout.measure = this._onmeasure.bind(this)

    this._apply()
  }

  // The size Yoga set on the element would come back as its desired size, so
  // it is set to `Auto` (`NaN` in XAML) while measuring. It is restored rather
  // than left to `_place`, because a node whose layout did not change is never
  // placed again.
  _onmeasure(width, widthMode, height, heightMode) {
    const box = { width: this._text.width, height: this._text.height }

    this._text.width = NaN
    this._text.height = NaN

    this._text.measure({
      width: widthMode === constants.MEASURE_MODE.UNDEFINED ? Infinity : width,
      height: Infinity
    })

    const measured = this._text.desiredSize

    this._text.width = box.width
    this._text.height = box.height

    return { width: measured.width + this._trailing, height: measured.height }
  }

  _apply() {
    this._inlines.clear()

    for (const run of this._runs) {
      const inline = new WinUIRun()

      const size = run.style.fontSize === undefined ? DEFAULT_FONT_SIZE : run.style.fontSize

      inline.text = run.text
      inline.fontSize = size

      // WinUI counts character spacing in thousandths of the font size.
      if (run.style.letterSpacing !== undefined) {
        inline.characterSpacing = Math.round((run.style.letterSpacing / size) * 1000)
      }

      const lines = style.decoration(run.style.textDecorationLine)

      inline.textDecorations =
        (lines.includes('underline') ? WinUIRun.TEXT_DECORATIONS.UNDERLINE : 0) |
        (lines.includes('line-through') ? WinUIRun.TEXT_DECORATIONS.STRIKETHROUGH : 0)
      inline.fontFamily =
        run.style.fontFamily === undefined || run.style.fontFamily === null
          ? this._defaults.fontFamily
          : family(run.style.fontFamily)
      inline.fontWeight = style.weight(run.style.fontWeight) || 400
      inline.fontStyle = style.italic(run.style.fontStyle)
        ? WinUIRun.FONT_STYLE.ITALIC
        : WinUIRun.FONT_STYLE.NORMAL

      if (run.style.color === undefined) {
        inline.foreground = this._defaults.foreground
      } else {
        const { red, green, blue, alpha } = style.color(run.style.color)

        inline.foreground = new WinUISolidColorBrush({
          color: {
            a: Math.round(alpha * 255),
            r: Math.round(red * 255),
            g: Math.round(green * 255),
            b: Math.round(blue * 255)
          }
        })
      }

      this._inlines.append(inline)
    }

    this._remeasure()
  }

  _resized(width, height) {
    const { top, right, bottom, left } = this._padding

    WinUICanvas.setLeft(this._text, left)
    WinUICanvas.setTop(this._text, top)

    this._text.width = Math.max(0, width - left - right)
    this._text.height = Math.max(0, height - top - bottom)

    this._painter.resize(width, height)
  }

  // A block applies the line limit itself, so its measurement is already capped.
  _truncated(lines, mode) {
    this._text.maxLines = lines
    this._text.textTrimming = mode === 'clip' ? TEXT_TRIMMING.CLIP : TEXT_TRIMMING.WORD_ELLIPSIS

    this._remeasure()
  }

  _paint(properties) {
    this._painter.apply(properties)

    let changed = this._inherit(properties)

    if ('textAlign' in properties) {
      this._text.textAlignment = ALIGNMENT[properties.textAlign]
    }

    // A line height of zero is the font's own.
    if ('lineHeight' in properties) {
      const { lineHeight } = properties

      this._text.lineHeight = lineHeight === undefined ? 0 : lineHeight

      changed = true
    }

    if (changed) this._apply()
  }

  [Symbol.for('bare.inspect')]() {
    return {
      __proto__: { constructor: NativeText }
    }
  }
}
