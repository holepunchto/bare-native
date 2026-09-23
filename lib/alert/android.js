const NDKDialog = require('bare-ndk/dialog')

const { BUTTON } = NDKDialog

// A dialog has a positive, a negative and a neutral slot and no way to add a
// fourth, so the affirmative one is the positive and the rest fill in from
// the negative, which is the order Android draws them in.
function place(buttons) {
  const last = buttons.length - 1

  return {
    positive: buttons[last].text,
    negative: buttons.length > 1 ? buttons[0].text : null,
    neutral: buttons.length > 2 ? buttons[1].text : null
  }
}

exports.alert = function alert(window, title, message, buttons) {
  const { promise, resolve } = Promise.withResolvers()

  const dialog = new NDKDialog({ title, message, ...place(buttons) })

  dialog.on('response', (which) => {
    if (which === BUTTON.POSITIVE) return resolve(buttons.length - 1)
    if (which === BUTTON.NEUTRAL) return resolve(1)

    // The negative slot holds the first button, and a dialog dismissed with
    // the back gesture is the same answer as pressing it.
    resolve(0)
  })

  dialog.show()

  return promise
}
