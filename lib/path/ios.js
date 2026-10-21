const UIKitBezierPath = require('bare-ui-kit/bezier-path')

const rounded = require('../rounded')

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
