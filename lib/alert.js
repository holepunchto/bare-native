const platform = require('#alert')

const STYLES = new Set(['default', 'cancel', 'destructive'])

// The most buttons any of the five will draw. A `ContentDialog` has a
// primary, a secondary and a close, and an `AlertDialog` a positive, a
// negative and a neutral, and neither can be given a fourth.
const BUTTONS = 3

// A modal question, which React Native spells `Alert.alert` and every toolkit
// here has its own object for. The buttons are given in the order they are
// written and the last is the affirmative one, which is where all five put
// their default.
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

  // A dialog belongs to whatever it is drawn over, which is a sheet on macOS,
  // a presented controller on iOS, a transient parent on GTK, the activity on
  // Android and the element tree's root on Windows.
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
