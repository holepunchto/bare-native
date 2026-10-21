const AppKitPasteboard = require('bare-app-kit/pasteboard')

const { TYPE } = AppKitPasteboard

function general() {
  return AppKitPasteboard.general()
}

exports.getString = function getString() {
  const string = general().stringForType(TYPE.STRING)

  return Promise.resolve(string === null ? '' : string)
}

// Without clearing, previously declared types would remain alongside the string.
exports.setString = function setString(content) {
  const pasteboard = general()

  pasteboard.clearContents()
  pasteboard.setString(content, TYPE.STRING)
}

exports.hasString = function hasString() {
  return Promise.resolve(general().availableTypeFrom([TYPE.STRING]) !== null)
}
