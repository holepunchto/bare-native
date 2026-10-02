const NDKActivity = require('bare-ndk/activity')
const NDKClipData = require('bare-ndk/clip-data')
const NDKClipboardManager = require('bare-ndk/clipboard-manager')

// Every clip carries one, shown to the user by the system's own clipboard UI,
// and nothing here has a better answer than what this is.
const LABEL = 'text'

exports.getString = function getString() {
  const clip = NDKClipboardManager.getPrimaryClip()

  if (clip === null || clip.itemCount === 0) return Promise.resolve('')

  // An item may hold a URI or an intent rather than text, and coercing is
  // what asks for whatever of it reads as text.
  const text = clip.getItemAt(0).coerceToText(NDKActivity)

  return Promise.resolve(text === null ? '' : text)
}

exports.setString = function setString(content) {
  NDKClipboardManager.setPrimaryClip(NDKClipData.newPlainText(LABEL, content))
}

exports.hasString = function hasString() {
  return Promise.resolve(NDKClipboardManager.hasPrimaryClip())
}
