const NDKActivity = require('bare-ndk/activity')

exports.read = function read(window) {
  const { density, widthPixels, heightPixels } = NDKActivity.resources.displayMetrics
  const { fontScale } = NDKActivity.resources.configuration

  return {
    // The display is reported in pixels rather than dp.
    screen: { width: widthPixels / density, height: heightPixels / density },
    scale: window.scale,
    fontScale
  }
}

exports.watch = function watch(window, onchange) {
  window.contentView._native.on('configurationChanged', onchange)
}
