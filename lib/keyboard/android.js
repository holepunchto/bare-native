const NDKWindowInsets = require('bare-ndk/window-insets')

const { IME } = NDKWindowInsets.TYPE

// The keyboard is an inset here like any other, so it is hidden by asking for
// the inset to go rather than by asking a field to stop editing.
exports.dismiss = function dismiss(window) {
  const controller = window.contentView._native.windowInsetsController

  if (controller !== null) controller.hide(IME)
}
