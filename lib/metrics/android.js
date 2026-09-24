const NDK = require('bare-ndk')

const { density } = NDK.Activity.resources.displayMetrics

// The tree is laid out in density independent pixels, as it is everywhere else,
// and Android draws in physical ones.
exports.px = function px(value) {
  return Math.round(value * density)
}

exports.dp = function dp(value) {
  return value / density
}
