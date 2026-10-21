// Corners are cubic approximations of quarter ellipses, since no toolkit
// takes four radii.
const KAPPA = 0.5522847498307936

// Clockwise from the top left. Radii are scaled down so that two on one side
// never exceed its length, as in CSS.
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
