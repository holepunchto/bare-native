const AppKitScreen = require('bare-app-kit/screen')

exports.read = function read(window) {
  // A window has no screen until it has been placed.
  const screen = window.native.screen

  const { width, height } = (screen === null ? AppKitScreen.main() : screen).frame

  return {
    screen: { width, height },
    scale: window.scale,

    // macOS has no system-wide text scaling.
    fontScale: 1
  }
}

exports.watch = function watch(window, onchange) {
  window.native.on('didChangeScreen', onchange)
  window.native.on('didChangeBackingProperties', onchange)
}
