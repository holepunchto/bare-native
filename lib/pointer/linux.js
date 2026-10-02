const GTKGestureDrag = require('bare-gtk/gesture-drag')
const { EVENT_SEQUENCE_STATE_CLAIMED, INPUT_SOURCE_TOUCHSCREEN } = require('bare-gtk/constants')

// GTK has no delivery mask on a widget: input arrives through a controller
// added to one. Creating that controller with the first listener and dropping
// it with the last is what a mask is on the other platforms, and it belongs
// here rather than in the binding because which controller to use, what to
// call what it reports, and who wins a press are all decisions of this layer.
//
// One drag gesture reports all four, because a pointer here is a press, what
// it does until it is let go, and how it ends. A `GtkEventControllerMotion`
// looks like the one to move with and is not: it reports a pointer that is
// merely over the widget, which is a hover rather than a gesture and is what
// only two of the five toolkits can report at all.
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

  // A drag reports where it started once and how far it has come since on
  // every event after that, and what crosses is where the pointer is now.
  function moved(offsetX, offsetY) {
    return read(startX + offsetX, startY + offsetY)
  }

  function listening() {
    return EVENTS.reduce((total, name) => total + node.listenerCount(name), 0)
  }

  node.on('newListener', (name) => {
    if (EVENTS.includes(name) === false || drag !== null) return

    drag = new GTKGestureDrag()

    drag.on('drag-begin', (x, y) => {
      // Claiming the sequence is what keeps the press from also reaching an
      // ancestor that is listening, so the innermost one wins.
      drag.setState(EVENT_SEQUENCE_STATE_CLAIMED)

      startX = lastX = x
      startY = lastY = y

      node.emit('pointerdown', read(x, y))
    })

    // GTK asks the surface for a motion event whenever the layout under the
    // pointer changes, so that what it is over stays right, and a gesture is
    // handed that as an update at the point it was already at. A listener that
    // moves something in response is then in a loop with the pointer standing
    // still, so a move to where the pointer already is is not one.
    drag.on('drag-update', (offsetX, offsetY) => {
      const x = startX + offsetX
      const y = startY + offsetY

      if (x === lastX && y === lastY) return

      lastX = x
      lastY = y

      node.emit('pointermove', read(x, y))
    })

    drag.on('drag-end', (offsetX, offsetY) => {
      node.emit('pointerup', moved(offsetX, offsetY))
    })

    // A cancelled gesture reports the sequence it gave up and not where it
    // was, so this is the one event that carries no point.
    drag.on('cancel', () => node.emit('pointercancel', read(0, 0)))

    native.addController(drag)
  })

  node.on('removeListener', (name) => {
    if (EVENTS.includes(name) === false || drag === null || listening() > 0) return

    native.removeController(drag)

    drag = null
  })
}
