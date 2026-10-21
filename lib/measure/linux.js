// A node taken out of the tree shares no ancestor with the root and has no
// bounds.
exports.locate = function locate(node, root) {
  const bounds = node.native.computeBounds(root.native)

  return bounds === null ? { x: 0, y: 0 } : { x: bounds[0], y: bounds[1] }
}
