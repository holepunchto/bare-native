const { test } = require('bare-tap')
const { Text, TextFragment } = require('..')
const { view } = require('./helpers')

const PARAGRAPH = 'The quick brown fox jumps over the lazy dog. '.repeat(6)

test('a text measures its content', (t) => {
  const text = new Text('Hello')
  const root = view({ alignItems: 'flex-start' }, [text])

  t.teardown(() => root.destroy())

  root.layout(400, 400)

  const { width, height } = text.measure()

  t.ok(width > 0, 'a width')
  t.ok(height > 0, 'and a height')
})

test('a longer string is wider', (t) => {
  const short = new Text('Hi')
  const long = new Text('Hi there, how are you')
  const root = view({ alignItems: 'flex-start' }, [short, long])

  t.teardown(() => root.destroy())

  root.layout(1000, 400)

  t.ok(long.measure().width > short.measure().width)
})

test('a text wraps to the width it is given', (t) => {
  const text = new Text(PARAGRAPH)
  const root = view({}, [text])

  t.teardown(() => root.destroy())

  root.layout(1000, 1000)

  const wide = text.measure().height

  root.layout(150, 1000)

  const narrow = text.measure()

  t.ok(narrow.height > wide, 'taller when narrower')
  t.ok(narrow.width <= 150, 'and no wider than its box')
})

test('a line limit caps the height', (t) => {
  const free = new Text(PARAGRAPH)
  const capped = new Text(PARAGRAPH)

  capped.numberOfLines = 1

  const root = view({}, [free, capped])

  t.teardown(() => root.destroy())

  root.layout(150, 1000)

  t.ok(capped.measure().height < free.measure().height)
  t.strictEqual(capped.numberOfLines, 1)
})

test('a larger font measures larger', (t) => {
  const small = new Text('Hello')
  const large = new Text('Hello')

  small.style = { fontSize: 10 }
  large.style = { fontSize: 30 }

  const root = view({ alignItems: 'flex-start' }, [small, large])

  t.teardown(() => root.destroy())

  root.layout(400, 400)

  t.ok(large.measure().height > small.measure().height, 'taller')
  t.ok(large.measure().width > small.measure().width, 'and wider')
})

test('changing the text is measured on the next pass', (t) => {
  const text = new Text('a')
  const root = view({ alignItems: 'flex-start' }, [text])

  t.teardown(() => root.destroy())

  root.layout(400, 400)

  const before = text.measure().width

  text.text = 'a much longer string'

  root.layout(400, 400)

  t.ok(text.measure().width > before)
  t.strictEqual(text.text, 'a much longer string')
})

test('a nested fragment is measured as part of the text', (t) => {
  const plain = new Text('Hello')
  const nested = new Text('Hello')
  const fragment = new TextFragment(' world')

  nested.appendChild(fragment)

  const root = view({ alignItems: 'flex-start' }, [plain, nested])

  t.teardown(() => root.destroy())

  root.layout(400, 400)

  t.ok(nested.measure().width > plain.measure().width)
  t.strictEqual(nested.text, 'Hello', 'the text of the paragraph itself')
})

test('a text transform changes the drawing but not the text', (t) => {
  const text = new Text('shout')

  t.teardown(() => text.destroy())

  text.style = { textTransform: 'uppercase' }

  t.strictEqual(text.text, 'shout')
})
