// Ordered out rather than closed, because closing what may be the last window
// ends an application that has not said otherwise.
exports.hide = function hide(window, reload) {
  window.native.orderOut()

  return true
}
