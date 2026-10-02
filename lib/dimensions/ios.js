const UIKitFontMetrics = require('bare-ui-kit/font-metrics')

// The size UIKit draws body text at before it is scaled, which is what the
// scaling it reports is read back as a ratio against.
const BODY = 17

const metrics = UIKitFontMetrics.metricsForTextStyle(UIKitFontMetrics.FONT_TEXT_STYLE.BODY)

exports.read = function read(window) {
  const screen = window.native.windowScene.screen

  const { width, height } = screen.bounds

  return {
    screen: { width, height },
    scale: screen.scale,

    // UIKit has no scale to report, only a size category, and asking it to
    // scale a known value is what turns one into the other without a table
    // of multipliers fitted to an iOS version.
    fontScale: metrics.scaledValueForValue(BODY) / BODY
  }
}

// The size category is a trait, which is what the view already hears about.
exports.watch = function watch(window, onchange) {
  window.contentView._native.on('traitChange', onchange)
}
