const { dp } = require('../metrics/android')

// Android only reports window coordinates, so the root's position is
// subtracted.
exports.locate = function locate(node, root) {
  const here = node.native.locationInWindow
  const there = root.native.locationInWindow

  return { x: dp(here.x - there.x), y: dp(here.y - there.y) }
}
