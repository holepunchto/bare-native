const forward = require('../events')

const { dp } = require('../metrics/android')

// A `MotionEvent` reports in physical pixels, as everything else on Android
// does, and carries no button for a finger.
function touch(x, y, pointerId) {
  return { x: dp(x), y: dp(y), button: 0, pointerId, pointerType: 'touch' }
}

const EVENTS = {
  pointerdown: ['down', touch],
  pointermove: ['move', touch],
  pointerup: ['up', touch],
  pointercancel: ['cancel', touch]
}

module.exports = function pointer(node, native) {
  return forward(node, native, EVENTS)
}
