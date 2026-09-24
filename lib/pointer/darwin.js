const forward = require('../events')

function mouse({ x, y, button }) {
  return { x, y, button, pointerId: 0, pointerType: 'mouse' }
}

// `mouseDragged` rather than `mouseMoved`: AppKit delivers it to the view the
// press started in without a tracking area, which is the movement a gesture is
// made of. Hovering is a separate event and wants one.
const EVENTS = {
  pointerdown: ['mouseDown', mouse],
  pointerup: ['mouseUp', mouse],
  pointermove: ['mouseDragged', mouse]
}

module.exports = function pointer(node, native) {
  forward(node, native, EVENTS)
}
