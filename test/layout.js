const { test } = require('bare-tap')
const { view } = require('./helpers')

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

test('a node is measured within its parent and within the root', (t) => {
  const inner = view({ width: 10, height: 10, marginLeft: 7 })
  const middle = view({ padding: 10 }, [inner])
  const root = view({ padding: 5 }, [middle])

  t.teardown(() => root.destroy())

  root.layout(100, 100)

  const measured = inner.measure()

  t.strictEqual(measured.x, 17, 'within its parent')
  t.strictEqual(measured.y, 10)
  t.strictEqual(measured.pageX, 22, 'within the root')
  t.strictEqual(measured.pageY, 15)

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

function frame(node) {
  const { x, y, width, height } = node.measure()

  return { x, y, width, height }
}
