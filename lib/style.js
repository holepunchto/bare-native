const { constants } = require('bare-yoga')

const { EDGE, GUTTER } = constants

const DEFAULT = Symbol('bare.native.default')

// Style values follow CSS naming, which is what a caller arriving from the web
// or from React Native expects. Mapping them onto Yoga's enumerations happens
// here so that no platform file has to know about either vocabulary.

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

// Removing a property has to put the node back where it started, so an
// undefined value resolves to the initial value rather than being rejected.
function keyword(table, name, value) {
  if (value === undefined) return table[DEFAULT]

  const mapped = table[value]

  if (mapped === undefined) {
    throw new TypeError(`Unknown value '${value}' for style property '${name}'`)
  }

  return mapped
}

// The environment a tree is laid out in, as CSS names it. A platform that
// covers part of the window reports it here and every length can refer to it,
// which is what `env()` was added to CSS for.
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
  flexBasis: (node, value, env) => (node.flexBasis = number(value, env)),
  aspectRatio: (node, value, env) => (node.aspectRatio = number(value, env)),

  width: (node, value, env) => (node.width = number(value, env)),
  height: (node, value, env) => (node.height = number(value, env)),
  minWidth: (node, value, env) => (node.minWidth = number(value, env)),
  minHeight: (node, value, env) => (node.minHeight = number(value, env)),
  maxWidth: (node, value, env) => (node.maxWidth = number(value, env)),
  maxHeight: (node, value, env) => (node.maxHeight = number(value, env)),

  gap: (node, value, env) => node.setGap(GUTTER.ALL, number(value, env)),
  rowGap: (node, value, env) => node.setGap(GUTTER.ROW, number(value, env)),
  columnGap: (node, value, env) => node.setGap(GUTTER.COLUMN, number(value, env)),

  top: (node, value, env) => node.setPosition(EDGE.TOP, number(value, env)),
  right: (node, value, env) => node.setPosition(EDGE.RIGHT, number(value, env)),
  bottom: (node, value, env) => node.setPosition(EDGE.BOTTOM, number(value, env)),
  left: (node, value, env) => node.setPosition(EDGE.LEFT, number(value, env)),
  start: (node, value, env) => node.setPosition(EDGE.START, number(value, env)),
  end: (node, value, env) => node.setPosition(EDGE.END, number(value, env)),

  ...spread('margin', (node, edge, value, env) => node.setMargin(edge, number(value, env))),
  ...spread('padding', (node, edge, value, env) => node.setPadding(edge, number(value, env))),
  ...spread('borderWidth', (node, edge, value, env) => node.setBorder(edge, number(value, env)))
}

// Painting is the platform's business, so these are collected and handed over
// rather than applied here.
//
// `borderWidth` is in `LAYOUT` as well, because Yoga insets a node's children
// by it and the platform draws it. Only the uniform value is painted; every
// platform layer that can draw a border draws one of a single thickness, so
// the per-edge variants inset without drawing.
const PAINT = new Set([
  'backgroundColor',
  'borderColor',
  'borderRadius',
  'borderWidth',
  'opacity',
  'overflow',
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

// Colours resolve to components in the zero to one range, which is what every
// platform's own colour type is built from.
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

// What a run of text can carry. A run has no box of its own, so nothing that
// lays one out, and alignment belongs to the paragraph rather than to a run
// inside it.
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

// Text carries properties that mean nothing on a plain view, and that a leaf
// has to re-measure itself after, so a primitive says which it accepts.
// Where a line sits is a property of the paragraph and not of a run inside
// it, as alignment is, so both are here rather than in `RUN`.
const TEXT = new Set([...PAINT, ...RUN, 'textAlign', 'lineHeight'])

// What a field holds is the person's, so there is nothing here to transform:
// a field would have either to change what they typed or to draw something
// other than the value it reports, and neither is what was asked for.
//
// A line height is absent for the other reason a property is: no WinUI text
// control has one, neither a `TextBox` nor a `PasswordBox`, so it would be a
// property four platforms honoured and one drew nothing for. An overflow is
// absent for the reason a control's and a picture's are: what a field holds is
// drawn by the field, which clips it whether or not it is asked to.
const INPUT = new Set([...TEXT])

INPUT.delete('textTransform')
INPUT.delete('lineHeight')
INPUT.delete('overflow')

// An image has nothing inside it to overflow, and every platform's image view
// clips its own content already, so what a view spends `overflow` on an image
// spends on `resizeMode`: how the picture fills the box it was given.
const IMAGE = new Set([...PAINT, 'resizeMode'])

IMAGE.delete('overflow')

// A control the toolkit draws has nothing inside it to overflow, as a picture
// has not.
const CONTROL = new Set([...PAINT])

CONTROL.delete('overflow')

// An indicator draws one thing in one colour, which is `color` as a text uses
// it rather than a background.
const INDICATOR = new Set([...CONTROL, 'color'])

// Every name the style layer knows, so that one it knows and this primitive
// does not can be told apart from one nobody has ever heard of.
const KNOWN = new Set([...PAINT, ...RUN, ...IMAGE, ...TEXT, ...INPUT, ...CONTROL, ...INDICATOR])

const LINES = new Set(['none', 'underline', 'line-through', 'underline line-through'])

// Which lines a run is drawn with. Every toolkit draws both and every one of
// them spells the pair differently, so the keyword crosses and the platform
// says it in its own words.
function decoration(value) {
  if (value === undefined) return REMOVED.textDecorationLine

  if (!LINES.has(value)) {
    throw new TypeError(`Unknown value '${value}' for style property 'textDecorationLine'`)
  }

  return value
}

const CASING = new Set(['none', 'uppercase', 'lowercase', 'capitalize'])

// The one text property no toolkit needs to be asked about, because changing
// the case of a string is not something any of them does better than the
// language does. Applied where the runs are made, so a platform is handed the
// text it draws and never learns this property exists.
function casing(text, value) {
  if (value === undefined || value === 'none') return text

  if (!CASING.has(value)) {
    throw new TypeError(`Unknown value '${value}' for style property 'textTransform'`)
  }

  if (value === 'uppercase') return text.toUpperCase()
  if (value === 'lowercase') return text.toLowerCase()

  return text.replace(/(^|\s)(\p{L})/gu, (match, before, letter) => before + letter.toUpperCase())
}

const FIT = new Set(['cover', 'contain', 'stretch', 'center'])

// What a picture does inside a box that is not its own shape. Each of the four
// is a value every one of the toolkits names for itself.
function fit(value) {
  if (value === undefined) return REMOVED.resizeMode

  if (!FIT.has(value)) {
    throw new TypeError(`Unknown value '${value}' for style property 'resizeMode'`)
  }

  return value
}

// Takes the run properties out of a paint and reports whether any changed.
// A text and a text input both keep the style their one font is resolved from,
// and both have to build that font again when it moves.
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

// CSS numbers the weights and names two of them, and a platform needs the
// number, so the two names resolve to theirs.
function weight(value) {
  if (value === undefined) return undefined

  const named = WEIGHT[value]

  if (named !== undefined) return named

  const numeric = typeof value === 'number' ? value : Number(value)

  if (Number.isFinite(numeric)) return numeric

  throw new TypeError(`Cannot read '${value}' as a font weight`)
}

// CSS has three values for `fontStyle` and no toolkit here tells oblique from
// italic, so it resolves to whether the text is slanted.
function italic(value) {
  if (value === undefined || value === 'normal') return false

  if (value === 'italic' || value === 'oblique') return true

  throw new TypeError(`Cannot read '${value}' as a font style`)
}

const TRANSPARENT = { red: 0, green: 0, blue: 0, alpha: 0 }
const BLACK = { red: 0, green: 0, blue: 0, alpha: 1 }
const UNMOVED = { width: 0, height: 0 }

// What a painted property goes back to when it is dropped from a style. The
// laid-out half resolves its own through `keyword` and `number`, so only these
// need writing down. `color` and `fontSize` are absent because their default
// is the platform's own, and a platform reads `undefined` as a request for it.
const REMOVED = {
  backgroundColor: TRANSPARENT,
  borderColor: TRANSPARENT,
  borderRadius: 0,
  borderWidth: 0,
  opacity: 1,
  overflow: 'visible',
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
  resizeMode: 'cover'
}

// An unknown property is an error rather than a warning, because a misspelled
// style is otherwise invisible until someone notices the layout is wrong.
// Reports whether anything here referred to the environment, so that a node
// knows whether it has to be resolved again when the environment changes.
function apply(node, style, paint, accepted = PAINT, env = ENV, previous = null) {
  let environmental = false

  for (const name in style) {
    const value = style[name]

    const set = LAYOUT[name]

    if (set !== undefined) {
      set(node, value, env)

      if (dynamic(value)) environmental = true
    }

    // A painted length can refer to the environment as a laid-out one can, and
    // only ever resolves to a number, so anything else is handed over as it is.
    // An explicit `undefined` puts the property back where it started rather
    // than being rejected, which is what the laid-out half already does.
    if (accepted.has(name)) {
      if (value === undefined) paint[name] = REMOVED[name]
      else paint[name] = dynamic(value) ? number(value, env) : value
    }
    // A property this primitive does not take is refused even when another one
    // paints it and even when it has a layout half of its own, because it
    // would otherwise be applied by halves or not at all, which is the silence
    // the rest of this refuses.
    else if (KNOWN.has(name)) {
      throw new TypeError(`Style property '${name}' does not apply to this node`)
    } else if (set === undefined) {
      throw new TypeError(`Unknown style property '${name}'`)
    }
  }

  // A property dropped from the style has to go back to where it started, and
  // the loop above cannot see it because it only visits what the style holds.
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
  fit,
  inherit,
  italic,
  weight,
  decoration,
  casing,
  CONTROL,
  ENV,
  IMAGE,
  INDICATOR,
  INPUT,
  LAYOUT,
  PAINT,
  RUN,
  TEXT
}
