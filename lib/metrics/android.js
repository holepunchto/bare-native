const NDKActivity = require('bare-ndk/activity')

const { density, densityDpi } = NDKActivity.resources.displayMetrics

exports.px = function px(value) {
  return Math.round(value * density)
}

exports.dp = function dp(value) {
  return value / density
}

exports.scale = density

// A `View` divides the camera distance by the screen dpi and Skia multiplies
// it by 72, landing in physical pixels.
exports.depth = function depth(value) {
  return (exports.px(value) * densityDpi) / 72
}
