const WinUIContentDialog = require('bare-win-ui/content-dialog')

const { BUTTON, RESULT } = WinUIContentDialog

// A dialog has a primary, a secondary and a close button and no way to add a
// fourth, so the affirmative one is the primary and the rest fill in from the
// close button backwards. That is also the order XAML draws them in.
function place(dialog, buttons) {
  const last = buttons.length - 1

  dialog.primaryButtonText = buttons[last].text

  if (buttons.length > 1) dialog.closeButtonText = buttons[0].text
  if (buttons.length > 2) dialog.secondaryButtonText = buttons[1].text

  dialog.defaultButton = BUTTON.PRIMARY
}

exports.alert = function alert(window, title, message, buttons) {
  const { promise, resolve } = Promise.withResolvers()

  const dialog = new WinUIContentDialog()

  dialog.title = title

  if (message !== null) dialog.content = message

  dialog.xamlRoot = window.contentView._native.xamlRoot

  place(dialog, buttons)

  dialog.showAsync((result) => {
    if (result === RESULT.PRIMARY) return resolve(buttons.length - 1)
    if (result === RESULT.SECONDARY) return resolve(1)

    // Nothing is what the close button gives and what a dismissal gives, and
    // the first button is the close button whenever there is more than one.
    resolve(0)
  })

  return promise
}
