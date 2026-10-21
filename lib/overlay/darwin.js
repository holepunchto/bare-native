// Ordered out rather than closed, as closing the last window may quit the application.
exports.hide = function hide(window, reload) {
  window.native.orderOut()

  return true
}
