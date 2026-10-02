const UIKitBezierPath = require('bare-ui-kit/bezier-path')

const rounded = require('../rounded')

// The shape a layer draws, built with the toolkit's own path type. A shape
// layer takes a `CGPath` and both of these answer one, which is the only thing
// `bare-core-animation` asks of either.
module.exports = function path(width, height, radii) {
  const bezier = new UIKitBezierPath()

  for (const [operation, ...values] of rounded(width, height, radii)) {
    switch (operation) {
      case 'move':
        bezier.moveTo(...values)
        break
      case 'line':
        bezier.lineTo(...values)
        break
      case 'curve':
        bezier.curveTo(...values)
        break
      case 'close':
        bezier.closePath()
        break
    }
  }

  return bezier
}
