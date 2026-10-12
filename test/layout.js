const { test } = require('bare-tap')
const { Switch, Text, TextInput } = require('..')
const { mount, near, view } = require('./helpers')

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

test('a percentage is a share of the parent', (t) => {
  const child = view({ position: 'absolute', top: '100%', left: '25%', width: '50%', height: 10 })
  const root = view({ padding: '10%' }, [child])

  t.teardown(() => root.destroy())

  root.layout(200, 100)

  t.deepStrictEqual(frame(child), { x: 50, y: 100, width: 100, height: 10 })
  t.deepStrictEqual(root.measureEdges().padding, { top: 20, right: 20, bottom: 20, left: 20 })
})

test('an automatic margin takes up the free space', (t) => {
  const child = view({ width: 40, height: 10, marginLeft: 'auto', marginRight: 'auto' })
  const root = view({}, [child])

  t.teardown(() => root.destroy())

  root.layout(200, 100)

  t.deepStrictEqual(frame(child), { x: 80, y: 0, width: 40, height: 10 })

  t.throws(() => {
    child.style = { padding: 'auto' }
  }, /as a length/)
})

test('an anchored node is placed beside its rectangle', (t) => {
  const box = view({ position: 'absolute', width: 60, height: 20 })
  const root = view({}, [box])

  t.teardown(() => root.destroy())

  box.anchor = { to: { x: 100, y: 50, width: 40, height: 10 }, side: 'top', offset: 6 }

  root.layout(200, 100)

  t.deepStrictEqual(frame(box), { x: 90, y: 24, width: 60, height: 20 }, 'above')

  box.anchor = { to: { x: 0, y: 10, width: 20, height: 10 }, side: 'top', offset: 6 }

  root.layout(200, 100)

  t.deepStrictEqual(frame(box), { x: 0, y: 26, width: 60, height: 20 }, 'flipped and shifted')

  box.anchor = { to: { x: 0, y: -10, width: 200, height: 110 }, side: 'top', offset: 6 }

  root.layout(200, 100)

  t.deepStrictEqual(frame(box), { x: 70, y: 6, width: 60, height: 20 }, 'over the rectangle')

  box.anchor = { to: { x: 0, y: 20, width: 200, height: 70 }, side: 'top', offset: 6 }

  root.layout(200, 100)

  t.deepStrictEqual(frame(box), { x: 70, y: 26, width: 60, height: 20 }, 'inside its edge')
})

test('an anchored node inside another follows it', (t) => {
  const target = view({ position: 'absolute', left: 100, top: 50, width: 40, height: 10 })
  const arrow = view({ position: 'absolute', width: 8, height: 8 }, [view({ flex: 1 })])
  const box = view({ position: 'absolute', width: 60, height: 20 }, [arrow])
  const root = view({}, [target, box])

  t.teardown(() => root.destroy())

  box.anchor = { to: target, side: 'top', offset: 6 }
  arrow.anchor = { to: target, side: 'top', offset: 2 }

  root.layout(200, 100)

  t.deepStrictEqual(frame(arrow), { x: 26, y: 16, width: 8, height: 8 }, 'on the bottom edge')

  target.style = { position: 'absolute', left: 0, top: 10, width: 20, height: 10 }

  root.layout(200, 100)

  t.deepStrictEqual(frame(box), { x: 0, y: 26, width: 60, height: 20 }, 'flipped')
  t.deepStrictEqual(frame(arrow), { x: 6, y: -4, width: 8, height: 8 }, 'and flipped with it')

  target.style = { position: 'absolute', left: 0, top: 0, width: 200, height: 100 }

  root.layout(200, 100)

  t.strictEqual(arrow.measure().width, 0, 'with nothing to stand beside')
})

test('an anchored node is kept inside the border of its parent', (t) => {
  const box = view({ position: 'absolute', width: 60, height: 20 })
  const root = view({ padding: 10, borderWidth: 2 }, [box])

  t.teardown(() => root.destroy())

  box.anchor = { to: { x: 0, y: 40, width: 20, height: 10 }, side: 'bottom' }

  root.layout(200, 100)

  t.deepStrictEqual(frame(box), { x: 2, y: 50, width: 60, height: 20 }, 'over its padding')
})

test('an anchored node takes its size from what it is placed beside', async (t) => {
  const box = view({ position: 'absolute', width: 60, height: 20 })
  const root = view({}, [box])

  t.teardown(() => root.destroy())

  const to = { x: 10, y: 10, width: 80, height: 30 }

  box.anchor = { to, side: 'bottom', match: 'width' }

  root.layout(200, 100)

  await Promise.resolve()

  t.deepStrictEqual(frame(box), { x: 10, y: 40, width: 80, height: 20 }, 'as asked')

  box.anchor = { to, side: 'bottom' }

  await Promise.resolve()

  t.deepStrictEqual(frame(box), { x: 20, y: 40, width: 60, height: 20 }, 'and from its style again')
})

test('an anchored node is placed again when its anchor changes', async (t) => {
  const box = view({ position: 'absolute', left: 5, top: 5, width: 60, height: 20 })
  const root = view({}, [box])

  t.teardown(() => root.destroy())

  root.layout(200, 100)

  box.anchor = { to: { x: 100, y: 40, width: 40, height: 10 }, side: 'right', align: 'start' }

  await Promise.resolve()

  t.deepStrictEqual(frame(box), { x: 140, y: 40, width: 60, height: 20 })

  box.anchor = null

  await Promise.resolve()

  t.deepStrictEqual(frame(box), { x: 5, y: 5, width: 60, height: 20 })
})

test('an anchored node is placed beside another node', (t) => {
  const box = view({ position: 'absolute', width: 60, height: 20 })
  const target = view({ width: 40, height: 10, marginTop: 50, marginLeft: 100 })
  const root = view({ padding: 10 }, [box, view({}, [target])])

  t.teardown(() => root.destroy())

  box.anchor = { to: target, side: 'bottom' }

  root.layout(300, 200)

  t.deepStrictEqual(frame(box), { x: 100, y: 70, width: 60, height: 20 })
})

test('an anchored node stays where the layout has it until there is something to anchor to', (t) => {
  const box = view({ position: 'absolute', left: 5, top: 5, width: 60, height: 20 })
  const root = view({}, [box])

  t.teardown(() => root.destroy())

  let target = null

  box.anchor = { to: () => target, side: 'right' }

  root.layout(200, 100)

  t.deepStrictEqual(frame(box), { x: 5, y: 5, width: 60, height: 20 })

  target = { x: 20, y: 30, width: 10, height: 10 }

  root.layout(200, 100)

  t.deepStrictEqual(frame(box), { x: 30, y: 25, width: 60, height: 20 })
})

test('an anchor is checked when it is set', (t) => {
  const box = view({ position: 'absolute' })

  t.teardown(() => box.destroy())

  t.throws(() => {
    box.anchor = { to: { x: 0, y: 0 } }
  }, /a rectangle/)

  t.throws(() => {
    box.anchor = { to: { x: 0, y: 0, width: 0, height: 0 }, side: 'above' }
  }, /Unknown anchor side/)

  t.throws(() => {
    box.anchor = { to: 'button' }
  }, /a node or a rectangle/)

  t.throws(() => {
    box.anchor = { to: { x: 0, y: 0, width: 0, height: 0 }, match: 'size' }
  }, /Unknown anchor match/)
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

  near(t, pageX, 22)
  near(t, pageY, 15)

  near(t, inner.measureLayout(middle), { x: 17, y: 10, width: 10, height: 10 })
})

test('the edges of a node are read from its layout', (t) => {
  const child = view({
    marginTop: 4,
    marginLeft: 10,
    borderWidth: 2,
    padding: 3,
    paddingRight: 6
  })
  const root = view({ width: 100, height: 100 }, [child])

  t.teardown(() => root.destroy())

  root.layout(100, 100)

  t.deepStrictEqual(child.measureEdges(), {
    margin: { top: 4, right: 0, bottom: 0, left: 10 },
    border: { top: 2, right: 2, bottom: 2, left: 2 },
    padding: { top: 3, right: 6, bottom: 3, left: 3 }
  })
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

    near(t, pageX, 10, node.constructor.name)
    near(t, pageY, y)
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
