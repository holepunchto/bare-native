const CoreAnimationLayer = require('bare-core-animation/layer')

// View frames ignore layer transforms, and an unflipped view's origin is at
// its bottom, so the whole box is converted through the layers.
exports.locate = function locate(node, root) {
  const layer = CoreAnimationLayer.of(node.native)

  return layer.convertRectToLayer(layer.bounds, CoreAnimationLayer.of(root.native))
}
