const WinUI = require('bare-win-ui')

const forward = require('../events')

const { POINTER_DEVICE_TYPE_TOUCH, POINTER_DEVICE_TYPE_PEN } = WinUI.constants

const TYPES = {
  [POINTER_DEVICE_TYPE_TOUCH]: 'touch',
  [POINTER_DEVICE_TYPE_PEN]: 'pen'
}

// WinUI reports a point in the element's own space, already in the units the
// tree is laid out in, and names the device the pointer came from.
function pointer({ x, y, pointerId, deviceType }) {
  return { x, y, button: 0, pointerId, pointerType: TYPES[deviceType] || 'mouse' }
}

const EVENTS = {
  pointerdown: ['pointerPressed', pointer],
  pointermove: ['pointerMoved', pointer],
  pointerup: ['pointerReleased', pointer],
  pointercancel: ['pointerCanceled', pointer]
}

module.exports = function (node, native) {
  forward(node, native, EVENTS)
}
