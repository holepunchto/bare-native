const platform = require('#alert')

const STYLES = new Set(['default', 'cancel', 'destructive'])

// Neither `ContentDialog` nor `AlertDialog` can have a fourth button.
const BUTTONS = 3

class NativeAlert {
  constructor() {
    this._window = null
  }

  alert(title, message = null, buttons = [{ text: 'OK' }]) {
    if (typeof title !== 'string') {
      throw new TypeError(`An alert title must be a string, not ${typeof title}`)
    }

    if (message !== null && message !== undefined && typeof message !== 'string') {
      throw new TypeError(`An alert message must be a string, not ${typeof message}`)
    }

    if (!Array.isArray(buttons) || buttons.length === 0) {
      throw new TypeError('An alert must have at least one button')
    }

    if (buttons.length > BUTTONS) {
      throw new RangeError(`An alert may have at most ${BUTTONS} buttons`)
    }

    const described = buttons.map((button, index) => describe(button, index))

    return platform
      .alert(this._attached(), title, message === undefined ? null : message, described)
      .then((index) => {
        const { onPress } = described[index]

        if (onPress !== null) onPress()

        return index
      })
  }

  _attached() {
    if (this._window === null) {
      throw new Error('An alert belongs to a window, and none has content yet')
    }

    return this._window
  }

  _attach(window) {
    this._window = window
  }
}

function describe(button, index) {
  if (button === null || typeof button !== 'object') {
    throw new TypeError(`Button ${index} must be an object`)
  }

  const { text, style = 'default', onPress = null } = button

  if (typeof text !== 'string') {
    throw new TypeError(`Button ${index} must have a text`)
  }

  if (!STYLES.has(style)) {
    throw new TypeError(`Unknown style '${style}' for button ${index}`)
  }

  if (onPress !== null && typeof onPress !== 'function') {
    throw new TypeError(`Button ${index} must have a function for 'onPress'`)
  }

  return { text, style, onPress }
}

module.exports = exports = new NativeAlert()
