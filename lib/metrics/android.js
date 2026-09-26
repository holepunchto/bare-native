const NDKActivity = require('bare-ndk/activity')

const { density, densityDpi } = NDKActivity.resources.displayMetrics

// The tree is laid out in density independent pixels, as it is everywhere else,
// and Android draws in physical ones.
exports.px = function px(value) {
  return Math.round(value * density)
}

exports.dp = function dp(value) {
  return value / density
}

// Where a camera stands, which crosses two conversions rather than one: a
// `View` divides the distance it is given by the screen's dpi, and Skia then
// multiplies by the 72 points it reads an inch as, landing in the physical
// pixels the view is drawn in.
exports.depth = function depth(value) {
  return (exports.px(value) * densityDpi) / 72
}
