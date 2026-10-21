const CoreAnimationLayer = require('bare-core-animation/layer')

// Converted through layers because a web view on iOS is not a UIKit view,
// AppKit frames ignore layer transforms, and unflipped views have a bottom
// origin.
exports.locate = function locate(node, root) {
  const layer = CoreAnimationLayer.of(node.native)

  return layer.convertRectToLayer(layer.bounds, CoreAnimationLayer.of(root.native))
}
