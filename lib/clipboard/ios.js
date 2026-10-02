const UIKitPasteboard = require('bare-ui-kit/pasteboard')

function general() {
  return UIKitPasteboard.generalPasteboard
}

exports.getString = function getString() {
  const string = general().string

  return Promise.resolve(string === null ? '' : string)
}

exports.setString = function setString(content) {
  general().string = content
}

exports.hasString = function hasString() {
  return Promise.resolve(general().hasStrings)
}
