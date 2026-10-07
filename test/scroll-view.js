const { test } = require('bare-tap')
const { ScrollView } = require('..')
const { mount, view } = require('./helpers')

function list(count) {
  const scroll = new ScrollView()

  scroll.style = { flex: 1 }

  for (let i = 0; i < count; i++) scroll.appendChild(view({ height: 50 }))

  return scroll
}

test('children are added to the content', (t) => {
  const scroll = list(3)

  t.teardown(() => scroll.destroy())

  t.strictEqual(scroll.children.length, 3)
  t.deepStrictEqual(scroll.content.children, scroll.children)
})

test('an offset before the first pass is zero', (t) => {
  const scroll = list(20)

  t.teardown(() => scroll.destroy())

  scroll.contentOffset = { y: 100 }

  t.strictEqual(scroll.contentOffset.y, 0)
})

test('the content takes its natural size along the axis', (t) => {
  const scroll = list(20)
  const root = view({ flex: 1 }, [scroll])

  mount(t, root)

  root.layout(200, 300)

  t.strictEqual(scroll.measure().height, 300, 'the viewport is its box')
  t.strictEqual(scroll.content.measure().height, 1000, 'the content is all of its children')
})

test('an offset is clamped to what there is to scroll', (t) => {
  const scroll = list(20)
  const root = view({ flex: 1 }, [scroll])

  mount(t, root)

  root.layout(200, 300)

  scroll.contentOffset = { y: 100 }

  t.strictEqual(scroll.contentOffset.y, 100, 'inside the range')

  scroll.contentOffset = { y: 100000 }

  t.strictEqual(scroll.contentOffset.y, 700, 'past the end')

  scroll.contentOffset = { y: -50 }

  t.strictEqual(scroll.contentOffset.y, 0, 'before the start')
})

test('the axis is settled when the view is made', (t) => {
  const scroll = new ScrollView({ horizontal: true })

  t.teardown(() => scroll.destroy())

  t.strictEqual(scroll.horizontal, true)
})
