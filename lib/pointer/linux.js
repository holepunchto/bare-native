const GTKGestureDrag = require('bare-gtk/gesture-drag')
const { EVENT_SEQUENCE_STATE_CLAIMED, INPUT_SOURCE_TOUCHSCREEN } = require('bare-gtk/constants')

// GTK has no delivery mask, so a drag gesture controller is added with the
// first listener and removed with the last. `GtkEventControllerMotion` is not
// used as it reports hover rather than gestures.
const EVENTS = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']

module.exports = function pointer(node, native) {
  let drag = null
  let startX = 0
  let startY = 0
  let lastX = 0
  let lastY = 0

  function read(x, y) {
    const device = drag.currentEventDevice

    return {
      x,
      y,
      button: 0,
      pointerId: 0,
      pointerType: device !== null && device.source === INPUT_SOURCE_TOUCHSCREEN ? 'touch' : 'mouse'
    }
  }

  function moved(offsetX, offsetY) {
    return read(startX + offsetX, startY + offsetY)
  }

  function listening() {
    return EVENTS.reduce((total, name) => total + node.listenerCount(name), 0)
  }

  node.on('newListener', (name) => {
    if (EVENTS.includes(name) === false || drag !== null) return

    drag = new GTKGestureDrag()

    drag.on('dragBegin', (x, y) => {
      // Claiming the sequence keeps the press from reaching listening ancestors.
      drag.setState(EVENT_SEQUENCE_STATE_CLAIMED)

      startX = lastX = x
      startY = lastY = y

      node.emit('pointerdown', read(x, y))
    })

    // GTK reports a motion at the same point whenever the layout under the pointer
    // changes, which would loop with a listener that moves something.
    drag.on('dragUpdate', (offsetX, offsetY) => {
      const x = startX + offsetX
      const y = startY + offsetY

      if (x === lastX && y === lastY) return

      lastX = x
      lastY = y

      node.emit('pointermove', read(x, y))
    })

    drag.on('dragEnd', (offsetX, offsetY) => {
      node.emit('pointerup', moved(offsetX, offsetY))
    })

    // A cancelled gesture carries no point.
    drag.on('cancel', () => node.emit('pointercancel', read(0, 0)))

    native.addController(drag)
  })

  node.on('removeListener', (name) => {
    if (EVENTS.includes(name) === false || drag === null || listening() > 0) return

    native.removeController(drag)

    drag = null
  })
}
