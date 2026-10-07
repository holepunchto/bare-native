const { afterAnimationFrame } = require('bare-animation-frame')
const { View, Window } = require('..')

// A window cannot be closed through this layer, and on iOS and Android there
// is only ever one, so every test shares a window and swaps its content.
let window = null
let empty = null

// GTK and XAML lay out on their own frames rather than during the call, so the
// new content is only placed once a frame has been drawn.
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
