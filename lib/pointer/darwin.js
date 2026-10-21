const forward = require('../events')

function mouse({ x, y, button }) {
  return { x, y, button, pointerId: 0, pointerType: 'mouse' }
}

// `mouseDragged` rather than `mouseMoved`, as AppKit delivers it to the view
// the press started in without a tracking area.
const EVENTS = {
  pointerdown: ['mouseDown', mouse],
  pointerup: ['mouseUp', mouse],
  pointermove: ['mouseDragged', mouse]
}

module.exports = function pointer(node, native) {
  return forward(node, native, EVENTS)
}
