const platform = require('#clipboard')

// Some platforms read asynchronously but none write asynchronously, so only reads return promises.
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

  // This does not read the string, because iOS prompts the user on every read.
  hasString() {
    return platform.hasString()
  }
}

module.exports = exports = new NativeClipboard()
