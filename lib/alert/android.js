const NDKDialog = require('bare-ndk/dialog')

const { BUTTON } = NDKDialog

// Fill the negative slot first, matching the order Android draws buttons in.
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

    // Dismissing with the back gesture counts as pressing the first button.
    resolve(0)
  })

  dialog.show()

  return promise
}
