const platform = require('#clipboard')

// The system clipboard, as much of it as all five agree on, which is text.
// React Native's vocabulary, and its asynchrony: two of the toolkits read
// through a callback and none of them writes through one, so a read is a
// promise everywhere and a write is not.
class NativeClipboard {
  getString() {
    return platform.getString()
  }

  setString(content) {
    if (typeof content !== 'string') {
      throw new TypeError(`Clipboard content must be a string, not ${typeof content}`)
    }

    platform.setString(content)
  }

  // Asking is not reading, which is the difference the Apple platforms charge
  // for: iOS raises a paste prompt when the string is read and says nothing
  // when it is only counted.
  hasString() {
    return platform.hasString()
  }
}

module.exports = exports = new NativeClipboard()
