const { afterAnimationFrame } = require('bare-animation-frame')
const Pointer = require('bare-pointer')
const { Dimensions, View, Window } = require('..')

// A window cannot be closed, and iOS and Android only have one, so the tests
// share a window and swap its content.
let window = null
let empty = null

// GTK and XAML only place new content on their next frame.
exports.mount = async function mount(t, root) {
  if (window === null) {
    empty = new View()
    window = new Window(400, 300).content(empty).show()
  }

  window.content(root)

  t.teardown(() => {
    window.content(empty)

    root.destroy()
  })

  await afterAnimationFrame()

  return window
}

// Layout is rounded to pixels, and a point is not always a whole number of
// them.
exports.near = function near(t, actual, expected, message) {
  const pixel = 1 / Dimensions.get('window').scale

  const close =
    typeof expected === 'number'
      ? Math.abs(actual - expected) <= pixel
      : Object.keys(expected).every((key) => Math.abs(actual[key] - expected[key]) <= pixel)

  if (close) t.pass(message)
  else t.deepStrictEqual(actual, expected, message)
}

exports.view = function view(style = {}, children = []) {
  const node = new View()

  node.style = style

  for (const child of children) node.appendChild(child)

  return node
}

exports.turn = function turn() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// Android views take pixels rather than dp.
exports.pointer = function pointer(t) {
  const pointer = new Pointer()
  const scale = Bare.platform === 'android' ? Dimensions.get('window').scale : 1

  t.teardown(() => pointer.destroy())

  const at = (value) => (value === undefined ? undefined : value * scale)

  return {
    down: (node, x, y) => pointer.down(node.native, at(x), at(y)),
    move: (node, x, y) => pointer.move(node.native, at(x), at(y)),
    up: () => pointer.up(),
    tap: (node, x, y) => pointer.tap(node.native, at(x), at(y))
  }
}
