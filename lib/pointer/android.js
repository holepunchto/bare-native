const forward = require('../events')

const { dp } = require('../metrics/android')

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
