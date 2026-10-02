const { POINTER_DEVICE_TYPE_TOUCH, POINTER_DEVICE_TYPE_PEN } = require('bare-win-ui/constants')

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
      // XAML raises `PointerMoved` for a pointer that is merely over the
      // element as well as one pressed on it, and what crosses is the movement
      // a gesture is made of, which is all three of the toolkits without a
      // hover can report. A hover is left to the element it passes over.
      if (name === 'pointermove' && args.isInContact === false) return

      // XAML delivers a pointer to whatever it is over, where the other four
      // deliver the rest of a gesture to whatever the press landed on. Taking
      // the capture on the press and giving it back on the release is what
      // makes a drag that leaves the box carry on reporting, as it does
      // everywhere else.
      if (name === 'pointerdown') args.capturePointer = true
      else if (name === 'pointerup' || name === 'pointercancel') {
        native.releasePointerCaptures()
      }

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
