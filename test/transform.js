const { test } = require('bare-tap')
const { View } = require('..')
const { afterAnimationFrame, mount, near, view } = require('./helpers')

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

  t.throws(() => {
    node.style = { transform: [{ translateX: '10px' }] }
  }, /as a number/)
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

  near(t, child.measure().pageX, before + 30)
})

test('a translation by a percentage is of the node itself', async (t) => {
  const child = view({ width: 40, height: 20 })
  const root = view({ padding: 10 }, [child])

  await mount(t, root)

  const before = child.measure()

  child.style = {
    width: 40,
    height: 20,
    transform: [{ translateX: '-50%' }, { translateY: '50%' }]
  }

  await afterAnimationFrame()

  const after = child.measure()

  near(t, after.pageX, before.pageX - 20)
  near(t, after.pageY, before.pageY + 10)
})
