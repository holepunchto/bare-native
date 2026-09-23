// A widget with no common ancestor has no bounds in one, which is what a node
// taken out of the tree is. What comes back is a rectangle as four numbers.
exports.locate = function locate(node, root) {
  const bounds = node.native.computeBounds(root.native)

  return bounds === null ? { x: 0, y: 0 } : { x: bounds[0], y: bounds[1] }
}
