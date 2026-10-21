const WinUIDisplayArea = require('bare-win-ui/display-area')
const WinUIUISettings = require('bare-win-ui/ui-settings')

const settings = new WinUIUISettings()

exports.read = function read(window) {
  const { scale } = window

  const area = WinUIDisplayArea.getFromWindowId(window.native.appWindow.id)

  // A display area is in physical pixels rather than DIPs.
  const { width, height } = area.outerBounds

  return {
    screen: { width: width / scale, height: height / scale },
    scale,
    fontScale: settings.textScaleFactor
  }
}

// XAML only reports these changes along with a window resize, which is already watched.
exports.watch = function watch(window, onchange) {}
