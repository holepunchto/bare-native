const AppKitAlert = require('bare-app-kit/alert')

const { MODAL_RESPONSE, STYLE } = AppKitAlert

// AppKit has no per button style, and what a destructive button gets instead
// is the alert drawn as a warning, which is the toolkit's own way of saying
// the same thing.
function style(buttons) {
  return buttons.some((button) => button.style === 'destructive')
    ? STYLE.CRITICAL
    : STYLE.INFORMATIONAL
}

exports.alert = function alert(window, title, message, buttons) {
  const { promise, resolve } = Promise.withResolvers()

  const native = new AppKitAlert()

  native.messageText = title

  if (message !== null) native.informativeText = message

  native.alertStyle = style(buttons)

  // AppKit numbers its buttons from the first one added, and adds them right
  // to left, so the affirmative one is written first here and read back as
  // the last of ours.
  for (let i = buttons.length - 1; i >= 0; i--) native.addButtonWithTitle(buttons[i].text)

  native.on('response', (response) => {
    resolve(buttons.length - 1 - (response - MODAL_RESPONSE.FIRST_BUTTON))
  })

  native.beginSheetModal(window.native)

  return promise
}
