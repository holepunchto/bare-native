const UIKitFontMetrics = require('bare-ui-kit/font-metrics')

// The unscaled body text size.
const BODY = 17

const metrics = UIKitFontMetrics.metricsForTextStyle(UIKitFontMetrics.FONT_TEXT_STYLE.BODY)

exports.read = function read(window) {
  const screen = window.native.windowScene.screen

  const { width, height } = screen.bounds

  return {
    screen: { width, height },
    scale: window.scale,

    // UIKit exposes only a size category, so derive a factor by scaling a known size.
    fontScale: metrics.scaledValueForValue(BODY) / BODY
  }
}

// Size category changes arrive as trait changes.
exports.watch = function watch(window, onchange) {
  window.contentView._native.on('traitChange', onchange)
}
