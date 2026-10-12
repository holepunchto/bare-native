const CoreAnimationLayer = require('bare-core-animation/layer')

// Every view has a layer, a web view included, which on iOS is not a UIKit
// view. AppKit frames also ignore layer transforms, and an unflipped view's
// origin is at its bottom, so the whole box is converted through the layers.
exports.locate = function locate(node, root) {
  const layer = CoreAnimationLayer.of(node.native)

  return layer.convertRectToLayer(layer.bounds, CoreAnimationLayer.of(root.native))
}
