const NDKWindowInsets = require('bare-ndk/window-insets')

const { IME } = NDKWindowInsets.TYPE

// The keyboard is an inset here, so it is hidden directly rather than by ending the edit.
exports.dismiss = function dismiss(window) {
  const controller = window.contentView._native.windowInsetsController

  if (controller !== null) controller.hide(IME)
}
