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

// AppKit hands the pointer to whichever tracking area it is over rather than
// to the view, so a box that wants a shape takes one out. The area follows the
// view's visible rect on its own, which is what `NSTrackingInVisibleRect` is
// for, so no resize reaches here.
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
