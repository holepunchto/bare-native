const { constants } = require('bare-yoga')

const { EDGE, GUTTER } = constants

const DEFAULT = Symbol('bare.native.default')

const FLEX_DIRECTION = {
  row: constants.FLEX_DIRECTION.ROW,
  'row-reverse': constants.FLEX_DIRECTION.ROW_REVERSE,
  column: constants.FLEX_DIRECTION.COLUMN,
  'column-reverse': constants.FLEX_DIRECTION.COLUMN_REVERSE,
  [DEFAULT]: constants.FLEX_DIRECTION.COLUMN
}

const JUSTIFY = {
  'flex-start': constants.JUSTIFY.FLEX_START,
  center: constants.JUSTIFY.CENTER,
  'flex-end': constants.JUSTIFY.FLEX_END,
  'space-between': constants.JUSTIFY.SPACE_BETWEEN,
  'space-around': constants.JUSTIFY.SPACE_AROUND,
  'space-evenly': constants.JUSTIFY.SPACE_EVENLY,
  [DEFAULT]: constants.JUSTIFY.FLEX_START
}

const ALIGN = {
  auto: constants.ALIGN.AUTO,
  'flex-start': constants.ALIGN.FLEX_START,
  center: constants.ALIGN.CENTER,
  'flex-end': constants.ALIGN.FLEX_END,
  stretch: constants.ALIGN.STRETCH,
  baseline: constants.ALIGN.BASELINE,
  'space-between': constants.ALIGN.SPACE_BETWEEN,
  'space-around': constants.ALIGN.SPACE_AROUND,
  'space-evenly': constants.ALIGN.SPACE_EVENLY,
  [DEFAULT]: constants.ALIGN.STRETCH
}

const POSITION = {
  static: constants.POSITION_TYPE.STATIC,
  relative: constants.POSITION_TYPE.RELATIVE,
  absolute: constants.POSITION_TYPE.ABSOLUTE,
  [DEFAULT]: constants.POSITION_TYPE.RELATIVE
}

const WRAP = {
  nowrap: constants.WRAP.NO_WRAP,
  wrap: constants.WRAP.WRAP,
  'wrap-reverse': constants.WRAP.WRAP_REVERSE,
  [DEFAULT]: constants.WRAP.NO_WRAP
}

const OVERFLOW = {
  visible: constants.OVERFLOW.VISIBLE,
  hidden: constants.OVERFLOW.HIDDEN,
  scroll: constants.OVERFLOW.SCROLL,
  [DEFAULT]: constants.OVERFLOW.VISIBLE
}

const DISPLAY = {
  flex: constants.DISPLAY.FLEX,
  none: constants.DISPLAY.NONE,
  [DEFAULT]: constants.DISPLAY.FLEX
}

const DIRECTION = {
  inherit: constants.DIRECTION.INHERIT,
  ltr: constants.DIRECTION.LTR,
  rtl: constants.DIRECTION.RTL,
  [DEFAULT]: constants.DIRECTION.INHERIT
}

// An undefined value resolves to the initial value, so removing a property
// restores the node.
function keyword(table, name, value) {
  if (value === undefined) return table[DEFAULT]

  const mapped = table[value]

  if (mapped === undefined) {
    throw new TypeError(`Unknown value '${value}' for style property '${name}'`)
  }

  return mapped
}

const ENV = {
  'safe-area-inset-top': 0,
  'safe-area-inset-right': 0,
  'safe-area-inset-bottom': 0,
  'safe-area-inset-left': 0,
  'keyboard-inset-height': 0
}

const VARIABLE = /^env\(\s*([a-z-]+)\s*\)$/i

function dynamic(value) {
  return typeof value === 'string' && VARIABLE.test(value)
}

function number(value, env) {
  if (value === undefined) return NaN

  if (typeof value !== 'string') return value

  const variable = VARIABLE.exec(value)

  if (variable === null) {
    throw new TypeError(`Cannot read '${value}' as a length`)
  }

  const resolved = env[variable[1]]

  if (resolved === undefined) {
    throw new TypeError(`Unknown environment variable '${variable[1]}'`)
  }

  return resolved
}

const PERCENTAGE = /^-?(\d+\.?\d*|\.\d+)%$/

function length(value, env) {
  if (typeof value === 'string' && PERCENTAGE.test(value)) return value

  return number(value, env)
}

function dimension(value, env) {
  if (value === 'auto') return value

  return length(value, env)
}

function spread(name, apply) {
  const properties = {}

  for (const [suffix, edge] of [
    ['', EDGE.ALL],
    ['Top', EDGE.TOP],
    ['Right', EDGE.RIGHT],
    ['Bottom', EDGE.BOTTOM],
    ['Left', EDGE.LEFT],
    ['Start', EDGE.START],
    ['End', EDGE.END],
    ['Horizontal', EDGE.HORIZONTAL],
    ['Vertical', EDGE.VERTICAL]
  ]) {
    properties[name + suffix] = (node, value, env) => apply(node, edge, value, env)
  }

  return properties
}

const LAYOUT = {
  direction: (node, value) => (node.direction = keyword(DIRECTION, 'direction', value)),
  flexDirection: (node, value) =>
    (node.flexDirection = keyword(FLEX_DIRECTION, 'flexDirection', value)),
  justifyContent: (node, value) =>
    (node.justifyContent = keyword(JUSTIFY, 'justifyContent', value)),
  alignContent: (node, value) => (node.alignContent = keyword(ALIGN, 'alignContent', value)),
  alignItems: (node, value) => (node.alignItems = keyword(ALIGN, 'alignItems', value)),
  alignSelf: (node, value) => (node.alignSelf = keyword(ALIGN, 'alignSelf', value)),
  position: (node, value) => (node.positionType = keyword(POSITION, 'position', value)),
  flexWrap: (node, value) => (node.flexWrap = keyword(WRAP, 'flexWrap', value)),
  overflow: (node, value) => (node.overflow = keyword(OVERFLOW, 'overflow', value)),
  display: (node, value) => (node.display = keyword(DISPLAY, 'display', value)),

  flex: (node, value, env) => (node.flex = number(value, env)),
  flexGrow: (node, value, env) => (node.flexGrow = number(value, env)),
  flexShrink: (node, value, env) => (node.flexShrink = number(value, env)),
  flexBasis: (node, value, env) => (node.flexBasis = dimension(value, env)),
  aspectRatio: (node, value, env) => (node.aspectRatio = number(value, env)),

  width: (node, value, env) => (node.width = dimension(value, env)),
  height: (node, value, env) => (node.height = dimension(value, env)),
  minWidth: (node, value, env) => (node.minWidth = length(value, env)),
  minHeight: (node, value, env) => (node.minHeight = length(value, env)),
  maxWidth: (node, value, env) => (node.maxWidth = length(value, env)),
  maxHeight: (node, value, env) => (node.maxHeight = length(value, env)),

  gap: (node, value, env) => node.setGap(GUTTER.ALL, length(value, env)),
  rowGap: (node, value, env) => node.setGap(GUTTER.ROW, length(value, env)),
  columnGap: (node, value, env) => node.setGap(GUTTER.COLUMN, length(value, env)),

  top: (node, value, env) => node.setPosition(EDGE.TOP, length(value, env)),
  right: (node, value, env) => node.setPosition(EDGE.RIGHT, length(value, env)),
  bottom: (node, value, env) => node.setPosition(EDGE.BOTTOM, length(value, env)),
  left: (node, value, env) => node.setPosition(EDGE.LEFT, length(value, env)),
  start: (node, value, env) => node.setPosition(EDGE.START, length(value, env)),
  end: (node, value, env) => node.setPosition(EDGE.END, length(value, env)),

  ...spread('margin', (node, edge, value, env) => node.setMargin(edge, dimension(value, env))),
  ...spread('padding', (node, edge, value, env) => node.setPadding(edge, length(value, env))),
  ...spread('borderWidth', (node, edge, value, env) => node.setBorder(edge, number(value, env)))
}

// `borderWidth` is also in `LAYOUT` because Yoga insets children by it. Only
// the uniform value is painted, as no platform draws per-edge widths.
const PAINT = new Set([
  'backgroundColor',
  'borderColor',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomRightRadius',
  'borderBottomLeftRadius',
  'borderStyle',
  'borderWidth',
  'cursor',
  'opacity',
  'overflow',
  'pointerEvents',
  'shadowColor',
  'shadowOffset',
  'shadowOpacity',
  'shadowRadius',
  'transform',
  'transformOrigin',
  'zIndex'
])

const HEX = /^#([0-9a-f]{3,8})$/i
const FUNCTIONAL = /^rgba?\(([^)]*)\)$/i

function color(value) {
  if (value === null || typeof value === 'object') return value

  if (typeof value !== 'string') {
    throw new TypeError(`Cannot read '${value}' as a colour`)
  }

  const hex = HEX.exec(value)

  if (hex) {
    const digits = hex[1]

    if (digits.length === 3 || digits.length === 4) {
      return {
        red: parseInt(digits[0] + digits[0], 16) / 255,
        green: parseInt(digits[1] + digits[1], 16) / 255,
        blue: parseInt(digits[2] + digits[2], 16) / 255,
        alpha: digits.length === 4 ? parseInt(digits[3] + digits[3], 16) / 255 : 1
      }
    }

    if (digits.length === 6 || digits.length === 8) {
      return {
        red: parseInt(digits.slice(0, 2), 16) / 255,
        green: parseInt(digits.slice(2, 4), 16) / 255,
        blue: parseInt(digits.slice(4, 6), 16) / 255,
        alpha: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1
      }
    }
  }

  const functional = FUNCTIONAL.exec(value)

  if (functional) {
    const parts = functional[1].split(/[,/\s]+/).filter((part) => part !== '')

    return {
      red: parseFloat(parts[0]) / 255,
      green: parseFloat(parts[1]) / 255,
      blue: parseFloat(parts[2]) / 255,
      alpha: parts.length > 3 ? parseFloat(parts[3]) : 1
    }
  }

  throw new TypeError(`Cannot read '${value}' as a colour`)
}

// A run has no box, so it takes no layout properties, and alignment belongs
// to the paragraph.
const RUN = new Set([
  'color',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'fontStyle',
  'letterSpacing',
  'textTransform',
  'textDecorationLine'
])

// Line height belongs to the paragraph, like alignment, so it is not in
// `RUN`.
const TEXT = new Set([...PAINT, ...RUN, 'textAlign', 'lineHeight'])

TEXT.delete('pointerEvents')

// A field cannot transform text without changing or misreporting what was
// typed. WinUI text inputs have no line height, and a field clips its own
// content regardless of `overflow`.
const INPUT = new Set([...TEXT])

INPUT.delete('textTransform')
INPUT.delete('lineHeight')
INPUT.delete('overflow')
INPUT.delete('pointerEvents')

// Image views clip their own content, so an image takes `resizeMode` instead
// of `overflow`.
const IMAGE = new Set([...PAINT, 'resizeMode', 'tintColor'])

IMAGE.delete('overflow')
IMAGE.delete('pointerEvents')

const CONTROL = new Set([...PAINT])

CONTROL.delete('overflow')
CONTROL.delete('pointerEvents')

const INDICATOR = new Set([...CONTROL, 'color'])

const KNOWN = new Set([...PAINT, ...RUN, ...IMAGE, ...TEXT, ...INPUT, ...CONTROL, ...INDICATOR])

const LINES = new Set(['none', 'underline', 'line-through', 'underline line-through'])

function decoration(value) {
  if (value === undefined) return REMOVED.textDecorationLine

  if (!LINES.has(value)) {
    throw new TypeError(`Unknown value '${value}' for style property 'textDecorationLine'`)
  }

  return value
}

const CASING = new Set(['none', 'uppercase', 'lowercase', 'capitalize'])

// Applied where runs are made, so a platform never sees this property.
function casing(text, value) {
  if (value === undefined || value === 'none') return text

  if (!CASING.has(value)) {
    throw new TypeError(`Unknown value '${value}' for style property 'textTransform'`)
  }

  if (value === 'uppercase') return text.toUpperCase()
  if (value === 'lowercase') return text.toLowerCase()

  return text.replace(/(^|\s)(\p{L})/gu, (match, before, letter) => before + letter.toUpperCase())
}

const STROKES = new Set(['solid', 'dotted', 'dashed'])

function stroke(value) {
  if (value === undefined) return REMOVED.borderStyle

  if (!STROKES.has(value)) {
    throw new TypeError(`Unknown value '${value}' for style property 'borderStyle'`)
  }

  return value
}

// A corner set on its own wins over `borderRadius` regardless of order.
function corners(radius, own) {
  return [
    own.topLeft ?? radius,
    own.topRight ?? radius,
    own.bottomRight ?? radius,
    own.bottomLeft ?? radius
  ]
}

const TARGETS = new Set(['auto', 'none'])

// Only `auto` and `none`, as the other CSS and React Native values would
// need custom hit testing on every platform.
function targets(value) {
  if (value === undefined) return true

  if (!TARGETS.has(value)) {
    throw new TypeError(`Unknown value '${value}' for style property 'pointerEvents'`)
  }

  return value === 'auto'
}

const POINTERS = new Set([
  'auto',
  'default',
  'pointer',
  'text',
  'crosshair',
  'not-allowed',
  'ew-resize',
  'ns-resize'
])

// Only cursors that AppKit, GTK and WinUI all have are accepted. AppKit lacks
// `move` and `wait`, WinUI lacks `grab` and `grabbing`, and only GTK has
// diagonal resizes.
function pointer(value) {
  if (value === undefined) return REMOVED.cursor

  if (!POINTERS.has(value)) {
    throw new TypeError(`Unknown value '${value}' for style property 'cursor'`)
  }

  return value
}

const FIT = new Set(['cover', 'contain', 'stretch', 'center'])

function fit(value) {
  if (value === undefined) return REMOVED.resizeMode

  if (!FIT.has(value)) {
    throw new TypeError(`Unknown value '${value}' for style property 'resizeMode'`)
  }

  return value
}

// Reports whether a run property changed, so the font can be rebuilt.
function inherit(own, properties) {
  let changed = false

  for (const name in properties) {
    if (!RUN.has(name)) continue

    own[name] = properties[name]
    changed = true
  }

  return changed
}

const WEIGHT = { normal: 400, bold: 700 }

function weight(value) {
  if (value === undefined) return undefined

  const named = WEIGHT[value]

  if (named !== undefined) return named

  const numeric = typeof value === 'number' ? value : Number(value)

  if (Number.isFinite(numeric)) return numeric

  throw new TypeError(`Cannot read '${value}' as a font weight`)
}

// No toolkit tells oblique from italic.
function italic(value) {
  if (value === undefined || value === 'normal') return false

  if (value === 'italic' || value === 'oblique') return true

  throw new TypeError(`Cannot read '${value}' as a font style`)
}

const TRANSPARENT = { red: 0, green: 0, blue: 0, alpha: 0 }
const BLACK = { red: 0, green: 0, blue: 0, alpha: 1 }
const UNMOVED = { width: 0, height: 0 }

// Painted defaults restored when a property is dropped. `color` and
// `fontSize` are absent because `undefined` asks for the platform default.
const REMOVED = {
  backgroundColor: TRANSPARENT,
  borderColor: TRANSPARENT,
  borderRadius: 0,
  borderTopLeftRadius: undefined,
  borderTopRightRadius: undefined,
  borderBottomRightRadius: undefined,
  borderBottomLeftRadius: undefined,
  borderStyle: 'solid',
  borderWidth: 0,
  cursor: 'auto',
  opacity: 1,
  overflow: 'visible',
  pointerEvents: 'auto',
  shadowColor: BLACK,
  shadowOffset: UNMOVED,
  shadowOpacity: 0,
  shadowRadius: 0,
  transform: undefined,
  transformOrigin: undefined,
  zIndex: 0,
  fontFamily: null,
  textAlign: 'natural',
  lineHeight: undefined,
  textTransform: 'none',
  textDecorationLine: 'none',
  resizeMode: 'cover',
  tintColor: null
}

function flatten(style, into = {}) {
  if (style === null || style === undefined || style === false) return into

  if (Array.isArray(style)) {
    for (const entry of style) flatten(entry, into)

    return into
  }

  for (const name in style) into[name] = style[name]

  return into
}

// Unknown properties throw, as a misspelled style is otherwise silent.
// Returns whether any value referred to the environment.
function apply(node, style, paint, accepted = PAINT, env = ENV, previous = null) {
  let environmental = false

  for (const name in style) {
    const value = style[name]

    const set = LAYOUT[name]

    if (set !== undefined) {
      set(node, value, env)

      if (dynamic(value)) environmental = true
    }

    // A painted length can use `env()` too. An explicit `undefined` resets the
    // property, as for layout.
    if (accepted.has(name)) {
      if (value === undefined) paint[name] = REMOVED[name]
      else paint[name] = dynamic(value) ? number(value, env) : value
    }
    // Refused even if another primitive paints it or it has a layout half, as it
    // would otherwise be applied partially or silently ignored.
    else if (KNOWN.has(name)) {
      throw new TypeError(`Style property '${name}' does not apply to this node`)
    } else if (set === undefined) {
      throw new TypeError(`Unknown style property '${name}'`)
    }
  }

  // Reset the properties dropped since the previous style.
  for (const name in previous) {
    if (name in style) continue

    const set = LAYOUT[name]

    if (set !== undefined) set(node, undefined, env)

    if (accepted.has(name)) paint[name] = REMOVED[name]
  }

  return environmental
}

module.exports = {
  apply,
  color,
  corners,
  flatten,
  fit,
  stroke,
  inherit,
  italic,
  pointer,
  targets,
  weight,
  decoration,
  casing,
  CONTROL,
  ENV,
  IMAGE,
  INDICATOR,
  INPUT,
  KNOWN,
  LAYOUT,
  PAINT,
  RUN,
  TEXT
}
