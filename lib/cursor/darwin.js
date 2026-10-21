const AppKitCursor = require('bare-app-kit/cursor')
const AppKitTrackingArea = require('bare-app-kit/tracking-area')

const SHAPES = {
  default: 'arrow',
  pointer: 'pointingHand',
  text: 'ibeam',
  crosshair: 'crosshair',
  'not-allowed': 'operationNotAllowed',
  'ew-resize': 'resizeLeftRight',
  'ns-resize': 'resizeUpDown'
}

// AppKit sends cursor updates to tracking areas rather than views. `IN_VISIBLE_RECT` keeps the
// area in sync with the view, so resizes need no handling.
module.exports = exports = class AppleCursor {
  constructor(view) {
    this._view = view
    this._area = null
    this._cursor = null
  }

  set(value) {
    const shape = SHAPES[value]

    if (shape === undefined) {
      if (this._area !== null) {
        this._view.removeTrackingArea(this._area)

        this._area = null
      }

      this._cursor = null

      return
    }

    this._cursor = AppKitCursor[shape]

    if (this._area !== null) return

    this._area = new AppKitTrackingArea({
      options:
        AppKitTrackingArea.OPTIONS.CURSOR_UPDATE |
        AppKitTrackingArea.OPTIONS.ACTIVE_IN_KEY_WINDOW |
        AppKitTrackingArea.OPTIONS.IN_VISIBLE_RECT
    })

    this._area.on('cursorUpdate', () => this._cursor.set())

    this._view.addTrackingArea(this._area)
  }
}
