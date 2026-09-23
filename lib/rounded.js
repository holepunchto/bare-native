// A quarter of an ellipse as a cubic, which is what every path here is built
// from: no toolkit below takes four radii and all of them take a curve.
const KAPPA = 0.5522847498307936

// A rounded rectangle as the moves, lines and curves that draw it, clockwise
// from the top left. A radius is clamped so that two on the same side never
// ask for more room than the side has, which is what CSS does with them.
module.exports = exports = function rounded(width, height, radii) {
  let [tl, tr, br, bl] = radii.map((radius) => Math.max(0, radius))

  const scale = Math.min(
    1,
    ratio(width, tl, tr),
    ratio(width, bl, br),
    ratio(height, tl, bl),
    ratio(height, tr, br)
  )

  tl *= scale
  tr *= scale
  br *= scale
  bl *= scale

  const path = [['move', tl, 0]]

  corner(path, width - tr, 0, width, 0, width, tr)
  corner(path, width, height - br, width, height, width - br, height)
  corner(path, bl, height, 0, height, 0, height - bl)
  corner(path, 0, tl, 0, 0, tl, 0)

  path.push(['close'])

  return path
}

// The edge up to where the corner starts, then the curve around it. The two
// control points sit a fixed fraction of the way from each end towards the
// corner the rectangle would have had, which is what turns a cubic into a
// quarter ellipse. A corner of no radius is the edge alone.
function corner(path, x, y, cornerX, cornerY, toX, toY) {
  path.push(['line', x, y])

  if (x === toX && y === toY) return

  path.push([
    'curve',
    toX,
    toY,
    x + (cornerX - x) * KAPPA,
    y + (cornerY - y) * KAPPA,
    toX + (cornerX - toX) * KAPPA,
    toY + (cornerY - toY) * KAPPA
  ])
}

function ratio(extent, a, b) {
  const total = a + b

  return total > extent ? extent / total : 1
}
