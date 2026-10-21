const WinUICanvasGeometry = require('bare-win-ui/canvas-geometry')
const WinUICanvasPathBuilder = require('bare-win-ui/canvas-path-builder')
const WinUICompositionPath = require('bare-win-ui/composition-path')

const rounded = require('../rounded')

// Composition has no general path, so it is built with Win2D.
module.exports = function path(width, height, radii) {
  const builder = new WinUICanvasPathBuilder()

  let open = false

  for (const [operation, ...values] of rounded(width, height, radii)) {
    switch (operation) {
      case 'move':
        builder.beginFigure(...values)
        open = true
        break
      case 'line':
        builder.addLine(...values)
        break
      case 'curve':
        builder.addCubicBezier(values[2], values[3], values[4], values[5], values[0], values[1])
        break
      case 'close':
        builder.endFigure(true)
        open = false
        break
    }
  }

  if (open) builder.endFigure(true)

  return new WinUICompositionPath(WinUICanvasGeometry.createPath(builder))
}
