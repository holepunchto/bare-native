const { afterAnimationFrame } = require('bare-animation-frame')
const { View, Window } = require('..')

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

exports.view = function view(style = {}, children = []) {
  const node = new View()

  node.style = style

  for (const child of children) node.appendChild(child)

  return node
}

exports.turn = function turn() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
