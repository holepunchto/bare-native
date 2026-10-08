const { test } = require('bare-tap')
const { Switch, Text, TextInput } = require('..')
const { mount, view } = require('./helpers')

test('a row shares its width between flexible children', (t) => {
  const a = view({ flex: 1 })
  const b = view({ flex: 3 })
  const root = view({ flexDirection: 'row' }, [a, b])

  t.teardown(() => root.destroy())

  root.layout(400, 100)

  t.deepStrictEqual(frame(a), { x: 0, y: 0, width: 100, height: 100 })
  t.deepStrictEqual(frame(b), { x: 100, y: 0, width: 300, height: 100 })
})

test('padding, margin and gap offset children', (t) => {
  const a = view({ height: 10, marginLeft: 5 })
  const b = view({ height: 10 })
  const root = view({ padding: 20, gap: 4 }, [a, b])

  t.teardown(() => root.destroy())

  root.layout(200, 200)

  t.deepStrictEqual(frame(a), { x: 25, y: 20, width: 155, height: 10 })
  t.deepStrictEqual(frame(b), { x: 20, y: 34, width: 160, height: 10 })
})

test('a node is measured within its parent', (t) => {
  const inner = view({ width: 10, height: 10, marginLeft: 7 })
  const middle = view({ padding: 10 }, [inner])
  const root = view({ padding: 5 }, [middle])

  t.teardown(() => root.destroy())

  root.layout(100, 100)

  const { x, y } = inner.measure()

  t.strictEqual(x, 17)
  t.strictEqual(y, 10)
})

// Where a node lands in the window is the toolkit's answer, so it is asked of
// a tree in a window once the toolkit has placed it.
test('a node is measured within the window and against another node', async (t) => {
  const inner = view({ width: 10, height: 10, marginLeft: 7 })
  const middle = view({ padding: 10 }, [inner])
  const root = view({ padding: 5 }, [middle])

  await mount(t, root)

  const { pageX, pageY } = inner.measure()

  t.strictEqual(pageX, 22)
  t.strictEqual(pageY, 15)

  t.deepStrictEqual(inner.measureLayout(middle), { x: 17, y: 10, width: 10, height: 10 })
})

test('a layout event fires when the frame changes and not otherwise', (t) => {
  const child = view({ flex: 1 })
  const root = view({}, [child])

  t.teardown(() => root.destroy())

  const frames = []

  child.on('layout', (frame) => frames.push(frame))

  root.layout(100, 50)
  root.layout(100, 50)

  t.deepStrictEqual(frames, [{ x: 0, y: 0, width: 100, height: 50 }], 'once for the first pass')

  root.layout(120, 50)

  t.strictEqual(frames.length, 2, 'again once it changed')
  t.deepStrictEqual(frames[1], { x: 0, y: 0, width: 120, height: 50 })
})

test('a layout listener may take nodes out of the tree', (t) => {
  const a = view({ height: 10 })
  const b = view({ height: 10 })
  const root = view({}, [a, b])

  t.teardown(() => root.destroy())

  a.on('layout', () => b.destroy())

  t.doesNotThrow(() => root.layout(100, 100))
  t.ok(b.destroyed)
})

test('a removed style property goes back to its default', (t) => {
  const child = view({ width: 10 })
  const root = view({ alignItems: 'flex-start' }, [child])

  t.teardown(() => root.destroy())

  root.layout(100, 100)

  t.strictEqual(child.measure().width, 10)

  child.style = {}

  root.layout(100, 100)

  t.strictEqual(child.measure().width, 0, 'no width, and nothing to stretch it')
})

test('a border insets children', (t) => {
  const child = view({ height: 10 })
  const root = view({ borderWidth: 5 }, [child])

  t.teardown(() => root.destroy())

  root.layout(100, 100)

  t.deepStrictEqual(frame(child), { x: 5, y: 5, width: 90, height: 10 })
})

test('an environment value follows the environment of the root', (t) => {
  const child = view({ height: 10 })
  const root = view({ paddingTop: 'env(safe-area-inset-top)' }, [child])

  t.teardown(() => root.destroy())

  root.env = { 'safe-area-inset-top': 20 }
  root.layout(100, 100)

  t.strictEqual(child.measure().y, 20)

  root.env = { 'safe-area-inset-top': 40 }
  root.layout(100, 100)

  t.strictEqual(child.measure().y, 40, 'and again when it changes')
})

test('an environment variable nobody set is zero', (t) => {
  const child = view({ height: 10 })
  const root = view({ paddingTop: 'env(keyboard-inset-height)' }, [child])

  t.teardown(() => root.destroy())

  root.layout(100, 100)

  t.strictEqual(child.measure().y, 0)
})

test('every primitive is measured within the window', async (t) => {
  const nodes = [new Text('a'), new TextInput(), new Switch()]
  const root = view({ padding: 10, gap: 10, alignItems: 'flex-start' }, nodes)

  await mount(t, root)

  for (const node of nodes) {
    const { y, pageX, pageY } = node.measure()

    t.strictEqual(pageX, 10, node.constructor.name)
    t.strictEqual(pageY, y)
  }
})

test('an absolute child is placed against its parent and takes no room', (t) => {
  const pinned = view({ position: 'absolute', top: 5, right: 10, width: 20, height: 20 })
  const flowing = view({ height: 10 })
  const root = view({ padding: 30 }, [pinned, flowing])

  t.teardown(() => root.destroy())

  root.layout(200, 100)

  t.deepStrictEqual(frame(pinned), { x: 170, y: 5, width: 20, height: 20 }, 'from the edges')
  t.deepStrictEqual(frame(flowing), { x: 30, y: 30, width: 140, height: 10 }, 'not displaced')
})

test('a child that is not displayed takes no room', (t) => {
  const hidden = view({ height: 10, display: 'none' })
  const shown = view({ height: 10 })
  const root = view({}, [hidden, shown])

  t.teardown(() => root.destroy())

  root.layout(100, 100)

  t.strictEqual(shown.measure().y, 0)
})

test('a size is held between its minimum and maximum', (t) => {
  const narrow = view({ width: 10, minWidth: 30, height: 10 })
  const wide = view({ flex: 1, maxWidth: 50, height: 10 })
  const root = view({ flexDirection: 'row' }, [narrow, wide])

  t.teardown(() => root.destroy())

  root.layout(200, 100)

  t.strictEqual(narrow.measure().width, 30, 'raised to the minimum')
  t.strictEqual(wide.measure().width, 50, 'capped at the maximum')
})

test('an aspect ratio sets the side that is left open', (t) => {
  const child = view({ width: 80, aspectRatio: 2 })
  const root = view({ alignItems: 'flex-start' }, [child])

  t.teardown(() => root.destroy())

  root.layout(200, 200)

  t.strictEqual(child.measure().height, 40)
})

test('wrapping moves children that do not fit onto another line', (t) => {
  const children = [0, 1, 2].map(() => view({ width: 40, height: 10 }))
  const root = view({ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' }, children)

  t.teardown(() => root.destroy())

  root.layout(100, 100)

  t.deepStrictEqual(
    children.map((child) => [child.measure().x, child.measure().y]),
    [
      [0, 0],
      [40, 0],
      [0, 10]
    ]
  )
})

test('children are aligned along and across the axis', (t) => {
  const child = view({ width: 20, height: 10 })
  const root = view({ justifyContent: 'flex-end', alignItems: 'center' }, [child])

  t.teardown(() => root.destroy())

  root.layout(100, 100)

  t.deepStrictEqual(frame(child), { x: 40, y: 90, width: 20, height: 10 })
})

test('start and end are the left and right of a left to right layout', (t) => {
  const child = view({ position: 'absolute', start: 10, end: 20, height: 10 })
  const root = view({}, [child])

  t.teardown(() => root.destroy())

  root.layout(100, 100)

  t.deepStrictEqual(frame(child), { x: 10, y: 0, width: 70, height: 10 })
})

function frame(node) {
  const { x, y, width, height } = node.measure()

  return { x, y, width, height }
}
