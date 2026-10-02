const AppKitPasteboard = require('bare-app-kit/pasteboard')

const { TYPE } = AppKitPasteboard

function general() {
  return AppKitPasteboard.general()
}

exports.getString = function getString() {
  const string = general().stringForType(TYPE.STRING)

  return Promise.resolve(string === null ? '' : string)
}

// A pasteboard holds one thing at a time, and writing without clearing leaves
// whatever else was declared beside it.
exports.setString = function setString(content) {
  const pasteboard = general()

  pasteboard.clearContents()
  pasteboard.setString(content, TYPE.STRING)
}

exports.hasString = function hasString() {
  return Promise.resolve(general().availableTypeFrom([TYPE.STRING]) !== null)
}
