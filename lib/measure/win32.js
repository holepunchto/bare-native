exports.locate = function locate(node, root) {
  return node.native.transformToVisual(root.native).transformPoint(0, 0)
}
