// Anchor positioning, as CSS calls it. A box's size does not depend on where
// it goes, so it is placed after the layout in the same pass.

const SIDES = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
const ALIGNMENTS = new Set(['start', 'center', 'end'])
const MATCHES = { width: ['width'], height: ['height'], both: ['width', 'height'] }
const RECTANGLE = ['x', 'y', 'width', 'height']

// A function lets a caller name a node that may not exist yet.
function options(value, isNode) {
  if (value === null) return null

  const { to, side = 'bottom', align = 'center', offset = 0, match = null } = value

  if (typeof to !== 'function' && !isNode(to)) rectangle(to)

  if (!(side in SIDES)) throw new TypeError(`Unknown anchor side '${side}'`)

  if (!ALIGNMENTS.has(align)) throw new TypeError(`Unknown anchor alignment '${align}'`)

  if (typeof offset !== 'number' || !Number.isFinite(offset)) {
    throw new TypeError(`Cannot read '${offset}' as an anchor offset`)
  }

  if (match !== null && !(match in MATCHES)) {
    throw new TypeError(`Unknown anchor match '${match}'`)
  }

  return { to, side, align, offset, match }
}

// As CSS's `anchor-size()`.
function matched(match, to) {
  if (match === null || to === null) return null

  const size = {}

  for (const name of MATCHES[match]) size[name] = to[name]

  return size
}

function rectangle(value) {
  if (value === null || typeof value !== 'object' || !RECTANGLE.every(finite(value))) {
    throw new TypeError('An anchor must be a node or a rectangle with a position and a size')
  }

  return value
}

// A box inside another anchored box follows the decision made for that one,
// which is what keeps an arrow on the edge of a tooltip. If the outer box had
// to cover its target, there is no side to follow.
function place({ side, align, offset }, to, width, height, bounds, outer = null) {
  if (outer !== null && outer.side === null) {
    return { side: null, flipped: false, x: 0, y: 0, width: 0, height: 0 }
  }

  let placed = side

  if (outer !== null && outer.flipped && vertical(side) === vertical(outer.side)) {
    placed = SIDES[side]
  }

  const [main, cross] = axes(placed, to, { width, height }, bounds)

  let position = beside(main, placed, offset)

  if (outer === null && !fits(main, position)) {
    const opposite = beside(main, SIDES[side], offset)

    if (fits(main, opposite)) {
      placed = SIDES[side]
      position = opposite
    } else {
      placed = null
      position = clamp(within(main, side, offset), main.min + offset, main.max - offset - main.size)
    }
  }

  const along = clamp(aligned(cross, align), cross.min, cross.max - cross.size)

  const frame = vertical(side)
    ? { x: along, y: position, width, height }
    : { x: position, y: along, width, height }

  return { side: placed, flipped: placed !== null && placed !== side, ...frame }
}

function axes(side, to, { width, height }, bounds) {
  const x = {
    start: to.x,
    extent: to.width,
    size: width,
    min: bounds.x,
    max: bounds.x + bounds.width
  }

  const y = {
    start: to.y,
    extent: to.height,
    size: height,
    min: bounds.y,
    max: bounds.y + bounds.height
  }

  return vertical(side) ? [y, x] : [x, y]
}

function vertical(side) {
  return side === 'top' || side === 'bottom'
}

function beside(main, side, offset) {
  return side === 'top' || side === 'left'
    ? main.start - offset - main.size
    : main.start + main.extent + offset
}

function within(main, side, offset) {
  return side === 'top' || side === 'left'
    ? main.start + offset
    : main.start + main.extent - offset - main.size
}

function fits(main, position) {
  return position >= main.min && position + main.size <= main.max
}

function aligned(cross, align) {
  if (align === 'start') return cross.start
  if (align === 'end') return cross.start + cross.extent - cross.size

  return cross.start + (cross.extent - cross.size) / 2
}

// A box larger than its bounds starts at their start.
function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max))
}

function finite(object) {
  return (name) => typeof object[name] === 'number' && Number.isFinite(object[name])
}

module.exports = { options, rectangle, matched, place }
