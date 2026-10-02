const WinUIDisplayArea = require('bare-win-ui/display-area')
const WinUIUISettings = require('bare-win-ui/ui-settings')

const settings = new WinUIUISettings()

exports.read = function read(window) {
  const scale = window.contentView._native.xamlRoot.rasterizationScale

  const area = WinUIDisplayArea.getFromWindowId(window.native.appWindow.id)

  // A display area is in physical pixels where XAML is in the DIPs everything
  // else here is written in.
  const { width, height } = area.outerBounds

  return {
    screen: { width: width / scale, height: height / scale },
    scale,
    fontScale: settings.textScaleFactor
  }
}

// XAML has no notification for either of these that does not also resize the
// window, which is what `Dimensions` already listens to.
exports.watch = function watch(window, onchange) {}
