// A WinUI window can be closed but not hidden, so the next failure gets a new
// one.
exports.hide = function hide(window, reload) {
  window.native.close()

  return false
}
