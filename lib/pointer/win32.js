const WinUI = require('bare-win-ui')

const { POINTER_DEVICE_TYPE_TOUCH, POINTER_DEVICE_TYPE_PEN } = WinUI.constants

const TYPES = {
  [POINTER_DEVICE_TYPE_TOUCH]: 'touch',
  [POINTER_DEVICE_TYPE_PEN]: 'pen'
}

const EVENTS = {
  pointerdown: 'pointerPressed',
  pointermove: 'pointerMoved',
  pointerup: 'pointerReleased',
  pointercancel: 'pointerCanceled'
}

// WinUI reports a point in the element's own space, already in the units the
// tree is laid out in, and names the device the pointer came from.
function pointer({ x, y, pointerId, deviceType }) {
  return { x, y, button: 0, pointerId, pointerType: TYPES[deviceType] || 'mouse' }
}

// `forward` is not used here because a routed event is handled or not, and
// which node consumes a pointer is this layer's rule rather than the
// binding's: the innermost node listening for it takes it.
module.exports = function (node, native) {
  const handlers = new Map()

  node.on('newListener', (name) => {
    if (name in EVENTS === false || handlers.has(name)) return

    const handler = (args) => {
      node.emit(name, pointer(args))

      args.handled = true
    }

    handlers.set(name, handler)

    native.on(EVENTS[name], handler)
  })

  node.on('removeListener', (name) => {
    if (handlers.has(name) === false || node.listenerCount(name) > 0) return

    native.off(EVENTS[name], handlers.get(name))

    handlers.delete(name)
  })
}
