const { test } = require('bare-tap')
const { afterAnimationFrame } = require('bare-animation-frame')
const { View } = require('..')
const { mount, view } = require('./helpers')

test('a transform is a list of operations', (t) => {
  const node = new View()

  t.teardown(() => node.destroy())

  node.style = { transform: [{ translateX: 10 }, { rotate: '45deg' }, { scale: 2 }] }

  t.deepStrictEqual(node.style.transform, [{ translateX: 10 }, { rotate: '45deg' }, { scale: 2 }])
})

test('a transform that cannot be drawn everywhere is refused', (t) => {
  const node = new View()

  t.teardown(() => node.destroy())

  t.throws(() => {
    node.style = { transform: [{ skewX: '10deg' }] }
  }, /Unknown transform operation 'skewX'/)

  t.throws(() => {
    node.style = { transformOrigin: '0 0 10' }
  }, /at most two positions/)
})

test('a malformed transform is refused', (t) => {
  const node = new View()

  t.teardown(() => node.destroy())

  t.throws(() => {
    node.style = { transform: { translateX: 10 } }
  }, /must be a list of operations/)

  t.throws(() => {
    node.style = { transform: [{ translateX: 10, translateY: 10 }] }
  }, /must name one operation/)

  t.throws(() => {
    node.style = { transform: [{ rotate: 'sideways' }] }
  }, /as an angle/)
})

test('a transform does not move the layout', (t) => {
  const child = view({ width: 10, height: 10, transform: [{ translateX: 30 }] })
  const root = view({}, [child])

  t.teardown(() => root.destroy())

  root.layout(100, 100)

  t.strictEqual(child.measure().x, 0)
})

test('a translation moves where a node lands in the window', async (t) => {
  const child = view({ width: 10, height: 10 })
  const root = view({ padding: 10 }, [child])

  await mount(t, root)

  const before = child.measure().pageX

  child.style = { width: 10, height: 10, transform: [{ translateX: 30 }] }

  await afterAnimationFrame()

  t.strictEqual(child.measure().pageX, before + 30)
})
