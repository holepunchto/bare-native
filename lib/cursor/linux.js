// GTK names its cursors after CSS, so the keyword crosses as it is written.
const NAMES = {
  auto: null,
  default: 'default',
  pointer: 'pointer',
  text: 'text',
  crosshair: 'crosshair',
  'not-allowed': 'not-allowed',
  'ew-resize': 'ew-resize',
  'ns-resize': 'ns-resize'
}

module.exports = exports = class LinuxCursor {
  constructor(widget) {
    this._widget = widget
  }

  set(value) {
    this._widget.setCursorFromName(NAMES[value])
  }
}
