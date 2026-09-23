exports.locate = function locate(node, root) {
  return node.native.convertPointToView(0, 0, root.native)
}
