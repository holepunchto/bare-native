const { View, Window } = require('..')

// A window cannot be closed through this layer, and on iOS and Android there
// is only ever one, so every test shares a window and swaps its content.
let window = null
let empty = null

exports.mount = function mount(t, root) {
  if (window === null) {
    empty = new View()
    window = new Window(400, 300).content(empty).show()
  }

  window.content(root)

  t.teardown(() => {
    window.content(empty)

    root.destroy()
  })

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
