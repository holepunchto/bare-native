const WinUIInputSystemCursor = require('bare-win-ui/input-system-cursor')

const { SHAPE } = WinUIInputSystemCursor

const SHAPES = {
  default: SHAPE.ARROW,
  pointer: SHAPE.HAND,
  text: SHAPE.IBEAM,
  crosshair: SHAPE.CROSS,
  'not-allowed': SHAPE.UNIVERSAL_NO,
  'ew-resize': SHAPE.SIZE_WEST_EAST,
  'ns-resize': SHAPE.SIZE_NORTH_SOUTH
}

// An element's cursor is declared protected in XAML, which is a rule for a
// subclass rather than one the ABI keeps, so it is reachable from here.
module.exports = exports = class WindowsCursor {
  constructor(element) {
    this._element = element
  }

  set(value) {
    const shape = SHAPES[value]

    this._element.protectedCursor =
      shape === undefined ? null : WinUIInputSystemCursor.create(shape)
  }
}
