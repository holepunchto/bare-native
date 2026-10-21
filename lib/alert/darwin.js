const AppKitAlert = require('bare-app-kit/alert')

const { MODAL_RESPONSE, STYLE } = AppKitAlert

// AppKit has no per-button style, so a destructive button makes the alert critical.
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

  // AppKit lays out buttons right to left in the order they are added, so they
  // are added last first.
  for (let i = buttons.length - 1; i >= 0; i--) native.addButtonWithTitle(buttons[i].text)

  native.on('response', (response) => {
    resolve(buttons.length - 1 - (response - MODAL_RESPONSE.FIRST_BUTTON))
  })

  native.beginSheetModal(window.native)

  return promise
}
