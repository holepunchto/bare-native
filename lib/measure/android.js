const { dp } = require('../metrics/android')

// Android answers in the window's own coordinates rather than another view's,
// so the root is asked as well and the difference is the answer.
exports.locate = function locate(node, root) {
  const here = node.native.locationInWindow
  const there = root.native.locationInWindow

  return { x: dp(here.x - there.x), y: dp(here.y - there.y) }
}
