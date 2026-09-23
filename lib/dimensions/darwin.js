const AppKitScreen = require('bare-app-kit/screen')

exports.read = function read(window) {
  // A window on no display has no screen of its own, which is what one
  // reports before it has been placed.
  const screen = window.native.screen

  const { width, height } = (screen === null ? AppKitScreen.main() : screen).frame

  return {
    screen: { width, height },
    scale: window.native.backingScaleFactor,

    // macOS scales the text of an application rather than of the system, so
    // there is nothing here to report and one is the whole answer.
    fontScale: 1
  }
}

exports.watch = function watch(window, onchange) {
  window.native.on('didChangeScreen', onchange)
  window.native.on('didChangeBackingProperties', onchange)
}
