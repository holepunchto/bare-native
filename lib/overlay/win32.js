// A WinUI window can be closed but not hidden.
exports.hide = function hide(window, reload) {
  window.native.close()

  return false
}
