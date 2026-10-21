const forward = require('../events')

function touch({ x, y, pointerId }) {
  return { x, y, button: 0, pointerId, pointerType: 'touch' }
}

const EVENTS = {
  pointerdown: ['touchesBegan', touch],
  pointermove: ['touchesMoved', touch],
  pointerup: ['touchesEnded', touch],
  pointercancel: ['touchesCancelled', touch]
}

module.exports = function pointer(node, native) {
  return forward(node, native, EVENTS)
}
