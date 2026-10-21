const GTKMessageDialog = require('bare-gtk/message-dialog')

const { MESSAGE_TYPE } = GTKMessageDialog

// GTK has no per-button style, so a destructive button makes the dialog a warning.
function type(buttons) {
  return buttons.some((button) => button.style === 'destructive')
    ? MESSAGE_TYPE.WARNING
    : MESSAGE_TYPE.QUESTION
}

exports.alert = function alert(window, title, message, buttons) {
  const { promise, resolve } = Promise.withResolvers()

  const dialog = new GTKMessageDialog({
    parent: window.native,
    messageType: type(buttons),
    text: title
  })

  if (message !== null) dialog.secondaryText = message

  // GTK reserves negative responses, which it reports for a dialog closed another way.
  buttons.forEach((button, index) => dialog.addButton(button.text, index))

  dialog.on('response', (response) => {
    dialog.visible = false

    resolve(response < 0 ? buttons.length - 1 : response)
  })

  dialog.visible = true

  return promise
}
