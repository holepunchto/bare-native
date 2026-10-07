const { test } = require('bare-tap')
const { afterAnimationFrame } = require('bare-animation-frame')
const { ScrollView } = require('..')
const { mount, view } = require('./helpers')

// Taller than the window on every platform.
const ROWS = 40
const ROW = 50

function list() {
  const scroll = new ScrollView()

  scroll.style = { flex: 1 }

  for (let i = 0; i < ROWS; i++) scroll.appendChild(view({ height: ROW }))

  return scroll
}

test('children are added to the content', (t) => {
  const scroll = list()

  t.teardown(() => scroll.destroy())

  t.strictEqual(scroll.children.length, ROWS)
  t.deepStrictEqual(scroll.content.children, scroll.children)
})

test('an offset before the first pass is zero', (t) => {
  const scroll = list()

  t.teardown(() => scroll.destroy())

  scroll.contentOffset = { y: 100 }

  t.strictEqual(scroll.contentOffset.y, 0)
})

test('the content takes its natural size along the axis', async (t) => {
  const scroll = list()

  const window = await mount(t, view({ flex: 1 }, [scroll]))

  t.strictEqual(scroll.measure().height, window.size.height, 'the viewport is its box')
  t.strictEqual(scroll.content.measure().height, ROWS * ROW, 'the content is all of its children')
})

test('an offset is clamped to what there is to scroll', async (t) => {
  const scroll = list()

  const window = await mount(t, view({ flex: 1 }, [scroll]))

  const end = ROWS * ROW - window.size.height

  scroll.contentOffset = { y: 100 }

  t.strictEqual(scroll.contentOffset.y, 100, 'inside the range')

  scroll.contentOffset = { y: 100000 }

  t.strictEqual(scroll.contentOffset.y, end, 'past the end')

  scroll.contentOffset = { y: -50 }

  t.strictEqual(scroll.contentOffset.y, 0, 'before the start')
})

test('the axis is settled when the view is made', (t) => {
  const scroll = new ScrollView({ horizontal: true })

  t.teardown(() => scroll.destroy())

  t.strictEqual(scroll.horizontal, true)
})

test('scrolling moves where the content lands in the window', async (t) => {
  const scroll = list()

  await mount(t, view({ flex: 1 }, [scroll]))

  const row = scroll.children[4]

  const before = row.measure().pageY

  scroll.contentOffset = { y: 100 }

  await afterAnimationFrame()

  t.strictEqual(row.measure().pageY, before - 100)
})
