// A transform is an ordered list of operations in CSS and in React Native
// alike, and no toolkit here takes the list, so this is where it becomes one
// matrix. The sixteen numbers are in the order `matrix3d` gives them, which is
// the order a `CATransform3D`, a `float4x4` and a `graphene_matrix_t` all hold
// their own in.

// What a platform is set back to when a transform is dropped, because a
// toolkit has no idea of not being transformed.
const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]

const ANGLE = /^(-?(?:\d+\.?\d*|\.\d+))(deg|rad)$/
const PERCENTAGE = /^(-?(?:\d+\.?\d*|\.\d+))%$/

function radians(name, value) {
  const angle = typeof value === 'string' ? ANGLE.exec(value) : null

  if (angle === null) {
    throw new TypeError(`Cannot read '${value}' as an angle for transform '${name}'`)
  }

  const magnitude = parseFloat(angle[1])

  return angle[2] === 'rad' ? magnitude : (magnitude * Math.PI) / 180
}

function scalar(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`Cannot read '${value}' as a number for transform '${name}'`)
  }

  return value
}

function translation(x, y, z) {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]
}

// Skewing is absent because Android cannot draw it: a `View` composes a fixed
// order of translation, rotation and scale about a pivot, and a shear is the
// one thing that order cannot express.
const OPERATIONS = {
  perspective(value, name) {
    const distance = scalar(name, value)

    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, distance === 0 ? 0 : -1 / distance, 0, 0, 0, 1]
  },

  rotateX(value, name) {
    const angle = radians(name, value)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    return [1, 0, 0, 0, 0, cos, sin, 0, 0, -sin, cos, 0, 0, 0, 0, 1]
  },

  rotateY(value, name) {
    const angle = radians(name, value)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    return [cos, 0, -sin, 0, 0, 1, 0, 0, sin, 0, cos, 0, 0, 0, 0, 1]
  },

  rotateZ(value, name) {
    const angle = radians(name, value)
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    return [cos, sin, 0, 0, -sin, cos, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  },

  scale(value, name) {
    const factor = scalar(name, value)

    return [factor, 0, 0, 0, 0, factor, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  },

  scaleX(value, name) {
    return [scalar(name, value), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  },

  scaleY(value, name) {
    return [1, 0, 0, 0, 0, scalar(name, value), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  },

  translateX(value, name) {
    return translation(scalar(name, value), 0, 0)
  },

  translateY(value, name) {
    return translation(0, scalar(name, value), 0)
  }
}

OPERATIONS.rotate = OPERATIONS.rotateZ

// A point is a column, so the last operation in the list is the first one
// applied, which is the order CSS reads a transform in.
function multiply(a, b) {
  const out = new Array(16)

  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      out[column * 4 + row] =
        a[row] * b[column * 4] +
        a[4 + row] * b[column * 4 + 1] +
        a[8 + row] * b[column * 4 + 2] +
        a[12 + row] * b[column * 4 + 3]
    }
  }

  return out
}

// An empty list is no transform rather than the identity, so a node that was
// never given one costs its platform nothing.
function compose(value) {
  if (value === undefined) return null

  if (!Array.isArray(value)) {
    throw new TypeError("Style property 'transform' must be a list of operations")
  }

  let matrix = null

  for (const operation of value) {
    const names = Object.keys(operation)

    if (names.length !== 1) {
      throw new TypeError('A transform operation must name one operation')
    }

    const name = names[0]
    const make = OPERATIONS[name]

    if (make === undefined) {
      throw new TypeError(`Unknown transform operation '${name}'`)
    }

    const next = make(operation[name], name)

    matrix = matrix === null ? next : multiply(matrix, next)
  }

  return matrix
}

const HORIZONTAL = { left: 0, center: 0.5, right: 1 }
const VERTICAL = { top: 0, center: 0.5, bottom: 1 }

function offset(table, value, extent) {
  const keyword = table[value]

  if (keyword !== undefined) return keyword * extent

  if (typeof value === 'number') return value

  // A string is the CSS shorthand taken apart, so a component of it can be a
  // length as well as a keyword or a percentage, and a length here is points.
  if (typeof value === 'string' && value !== '' && Number.isFinite(Number(value))) {
    return Number(value)
  }

  const percentage = typeof value === 'string' ? PERCENTAGE.exec(value) : null

  if (percentage === null) {
    throw new TypeError(`Cannot read '${value}' as a position for 'transformOrigin'`)
  }

  return (parseFloat(percentage[1]) / 100) * extent
}

// Where the transform is applied from, in points, which needs the box: the
// default is the middle of it, as it is in CSS.
function origin(value, width, height) {
  const parts =
    value === undefined ? [] : Array.isArray(value) ? value : String(value).trim().split(/\s+/)

  // Two positions rather than the three CSS allows, because Android's pivot
  // is the one place a platform applies the origin itself and it has no third
  // axis. A depth nobody can honour is better refused than dropped.
  if (parts.length > 2) {
    throw new TypeError("Style property 'transformOrigin' takes at most two positions")
  }

  let [x = 'center', y = 'center'] = parts

  // CSS lets the two keywords arrive in either order, and only a keyword says
  // which axis it belongs to.
  if (x in VERTICAL && !(x in HORIZONTAL)) [x, y] = [y, x]
  else if (y in HORIZONTAL && !(y in VERTICAL)) [x, y] = [y, x]

  return [offset(HORIZONTAL, x, width), offset(VERTICAL, y, height)]
}

// A platform that is told a transform again does work for it, and the layout
// pass tells it on every pass, so a platform that cannot afford that asks
// whether anything moved.
function equal(a, b) {
  if (a === null || b === null) return a === b

  return a.every((value, index) => value === b[index])
}

function around(matrix, [x, y]) {
  if (x === 0 && y === 0) return matrix

  return multiply(multiply(translation(x, y, 0), matrix), translation(-x, -y, 0))
}

// Reads the matrix back as the translation, rotation and scale it was built
// from. Android is the one platform that cannot be handed a matrix, because a
// `View` transformed by one is drawn where the matrix puts it and touched
// where it is not, so it takes the parts instead. Graphics Gems II, section
// 7.1, which is the same decomposition CSS specifies and React Native uses.
function decompose(matrix) {
  if (matrix[15] === 0) return null

  const m = []

  for (let row = 0; row < 4; row++) {
    m.push([
      matrix[row * 4] / matrix[15],
      matrix[row * 4 + 1] / matrix[15],
      matrix[row * 4 + 2] / matrix[15],
      matrix[row * 4 + 3] / matrix[15]
    ])
  }

  const flattened = m.map((row, index) => [...row.slice(0, 3), index === 3 ? 1 : 0])

  if (determinant(flattened) === 0) return null

  let perspective = [0, 0, 0, 1]

  if (m[0][3] !== 0 || m[1][3] !== 0 || m[2][3] !== 0) {
    const right = [m[0][3], m[1][3], m[2][3], m[3][3]]

    perspective = invert(flattened).map(
      (row) => row[0] * right[0] + row[1] * right[1] + row[2] * right[2] + row[3] * right[3]
    )
  }

  const translate = [m[3][0], m[3][1], m[3][2]]

  const rows = [m[0].slice(0, 3), m[1].slice(0, 3), m[2].slice(0, 3)]

  const scale = [0, 0, 0]

  scale[0] = magnitude(rows[0])
  rows[0] = normalize(rows[0], scale[0])

  rows[1] = combine(rows[1], rows[0], -dot(rows[0], rows[1]))
  scale[1] = magnitude(rows[1])
  rows[1] = normalize(rows[1], scale[1])

  rows[2] = combine(rows[2], rows[0], -dot(rows[0], rows[2]))
  rows[2] = combine(rows[2], rows[1], -dot(rows[1], rows[2]))
  scale[2] = magnitude(rows[2])
  rows[2] = normalize(rows[2], scale[2])

  // A negative determinant is a flip, which the lengths above cannot carry
  // because they are lengths.
  if (dot(rows[0], cross(rows[1], rows[2])) < 0) {
    for (let i = 0; i < 3; i++) {
      scale[i] = -scale[i]
      rows[i] = rows[i].map((value) => -value)
    }
  }

  const y = Math.asin(-rows[0][2])

  const rotate =
    Math.abs(Math.cos(y)) > 1e-6
      ? [Math.atan2(rows[1][2], rows[2][2]), y, Math.atan2(rows[0][1], rows[0][0])]
      : [Math.atan2(-rows[2][0], rows[1][1]), y, 0]

  return {
    perspective,
    translate,
    scale,
    rotate: rotate.map((angle) => (angle * 180) / Math.PI)
  }
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
}

function magnitude(a) {
  return Math.sqrt(dot(a, a))
}

function normalize(a, length) {
  return length === 0 ? a : a.map((value) => value / length)
}

function combine(a, b, scale) {
  return [a[0] + b[0] * scale, a[1] + b[1] * scale, a[2] + b[2] * scale]
}

function minor(m, row, column) {
  const rows = [0, 1, 2, 3].filter((i) => i !== row)
  const columns = [0, 1, 2, 3].filter((j) => j !== column)

  const [a, b, c] = rows.map((i) => columns.map((j) => m[i][j]))

  return (
    a[0] * (b[1] * c[2] - b[2] * c[1]) -
    a[1] * (b[0] * c[2] - b[2] * c[0]) +
    a[2] * (b[0] * c[1] - b[1] * c[0])
  )
}

function cofactor(m, row, column) {
  return ((row + column) % 2 === 0 ? 1 : -1) * minor(m, row, column)
}

function determinant(m) {
  return [0, 1, 2, 3].reduce((sum, column) => sum + m[0][column] * cofactor(m, 0, column), 0)
}

function invert(m) {
  const scale = 1 / determinant(m)

  return [0, 1, 2, 3].map((row) => [0, 1, 2, 3].map((column) => cofactor(m, column, row) * scale))
}

module.exports = { around, compose, decompose, equal, origin, IDENTITY }
