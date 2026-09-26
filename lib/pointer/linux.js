const GTKEventControllerMotion = require('bare-gtk/event-controller-motion')
const GTKGestureClick = require('bare-gtk/gesture-click')
const { EVENT_SEQUENCE_STATE_CLAIMED, INPUT_SOURCE_TOUCHSCREEN } = require('bare-gtk/constants')

// GTK has no delivery mask on a widget: input arrives through a controller
// added to one. Creating that controller with the first listener and dropping
// it with the last is what a mask is on the other platforms, and it belongs
// here rather than in the binding because which controller to use, what to
// call what it reports, and who wins a press are all decisions of this layer.
const PRESSING = ['pointerdown', 'pointerup', 'pointercancel']

module.exports = function pointer(node, native) {
  let click = null
  let motion = null

  function read(controller, x, y) {
    const device = controller.currentEventDevice

    return {
      x,
      y,
      button: 0,
      pointerId: 0,
      pointerType: device !== null && device.source === INPUT_SOURCE_TOUCHSCREEN ? 'touch' : 'mouse'
    }
  }

  function pressing() {
    return PRESSING.reduce((total, name) => total + node.listenerCount(name), 0)
  }

  node.on('newListener', (name) => {
    if (name === 'pointermove') {
      if (motion !== null) return

      motion = new GTKEventControllerMotion()

      motion.on('motion', (x, y) => node.emit('pointermove', read(motion, x, y)))

      native.addController(motion)

      return
    }

    if (PRESSING.includes(name) === false || click !== null) return

    click = new GTKGestureClick()

    click.on('pressed', (presses, x, y) => {
      // Claiming the sequence is what keeps the press from also reaching an
      // ancestor that is listening, so the innermost one wins.
      click.setState(EVENT_SEQUENCE_STATE_CLAIMED)

      node.emit('pointerdown', read(click, x, y))
    })

    click.on('released', (presses, x, y) => node.emit('pointerup', read(click, x, y)))

    // A cancelled gesture reports the sequence it gave up and not where it
    // was, so this is the one event that carries no point.
    click.on('cancel', () => node.emit('pointercancel', read(click, 0, 0)))

    native.addController(click)
  })

  node.on('removeListener', (name) => {
    if (name === 'pointermove' && motion !== null && node.listenerCount(name) === 0) {
      native.removeController(motion)

      motion = null

      return
    }

    if (PRESSING.includes(name) === false || click === null || pressing() > 0) return

    native.removeController(click)

    click = null
  })
}
