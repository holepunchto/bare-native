const GDKDisplay = require('bare-gtk/display')

const TEXT = 'text/plain'

function clipboard() {
  return GDKDisplay.getDefault().getClipboard()
}

exports.getString = function getString() {
  const { promise, resolve, reject } = Promise.withResolvers()

  clipboard().readTextAsync((err, text) => {
    if (err !== null) reject(new Error(err))
    else resolve(text === null ? '' : text)
  })

  return promise
}

exports.setString = function setString(content) {
  clipboard().setText(content)
}

// What the clipboard is offering, which answers without a read and therefore
// without waiting on whichever application owns it.
exports.hasString = function hasString() {
  return Promise.resolve(clipboard().formats.includes(TEXT))
}
