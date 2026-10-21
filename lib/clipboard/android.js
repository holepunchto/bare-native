const NDKActivity = require('bare-ndk/activity')
const NDKClipData = require('bare-ndk/clip-data')
const NDKClipboardManager = require('bare-ndk/clipboard-manager')

// Shown in the system clipboard UI.
const LABEL = 'text'

exports.getString = function getString() {
  const clip = NDKClipboardManager.getPrimaryClip()

  if (clip === null || clip.itemCount === 0) return Promise.resolve('')

  // An item may hold a URI or an intent rather than text.
  const text = clip.getItemAt(0).coerceToText(NDKActivity)

  return Promise.resolve(text === null ? '' : text)
}

exports.setString = function setString(content) {
  NDKClipboardManager.setPrimaryClip(NDKClipData.newPlainText(LABEL, content))
}

exports.hasString = function hasString() {
  return Promise.resolve(NDKClipboardManager.hasPrimaryClip())
}
