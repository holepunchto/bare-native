const NDKActivity = require('bare-ndk/activity')

exports.read = function read(window) {
  const { density, widthPixels, heightPixels } = NDKActivity.resources.displayMetrics
  const { fontScale } = NDKActivity.resources.configuration

  return {
    // The display is reported in pixels where everything else here is in the
    // units a style is written in, which is what the density converts.
    screen: { width: widthPixels / density, height: heightPixels / density },
    scale: density,
    fontScale
  }
}

exports.watch = function watch(window, onchange) {
  window.contentView._native.on('configurationChanged', onchange)
}
