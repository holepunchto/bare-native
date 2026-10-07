// An activity has one content view, so showing the overlay took the
// application's away, and only a graph that builds its window again can put it
// back. A window here is a handle on the activity, so the next failure takes a
// new one.
exports.hide = function hide(window, reload) {
  if (reload !== null) reload()

  return false
}
