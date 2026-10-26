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

function pointer({ x, y, pointerId, deviceType }) {
  return { x, y, button: 0, pointerId, pointerType: TYPES[deviceType] || 'mouse' }
}

// Not `forward`, as a routed event must be marked handled so that only the
// innermost listening node receives it.
module.exports = function (node, native) {
  const handlers = new Map()

  let lastX = 0
  let lastY = 0

  // A move is only reported to the node that took the press, as on the other
  // toolkits. A press that a descendant handled never reaches this node.
  let pressed = false

  const press = () => {
    pressed = true
  }

  const release = () => {
    pressed = false
  }

  node.on('newListener', (name) => {
    if (name in EVENTS === false || handlers.has(name)) return

    if (name === 'pointermove') {
      native.on('pointerPressed', press)
      native.on('pointerReleased', release)
      native.on('pointerCanceled', release)
    }

    const handler = (args) => {
      // Hover is ignored, as the other toolkits cannot report it.
      if (name === 'pointermove' && (args.isInContact === false || !pressed)) return

      // XAML reports a stationary move when another element captures the press.
      if (name === 'pointermove' && args.x === lastX && args.y === lastY) return

      lastX = args.x
      lastY = args.y

      // XAML delivers a pointer to whatever it is over, so the pointer is captured
      // on press to keep a drag that leaves the element reporting.
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

    if (name === 'pointermove') {
      native.off('pointerPressed', press)
      native.off('pointerReleased', release)
      native.off('pointerCanceled', release)

      pressed = false
    }
  })
}
