// The overlay replaced the activity's only content view, so only a reload restores the
// application, and the next failure needs a new window.
exports.hide = function hide(window, reload) {
  if (reload !== null) reload()

  return false
}
