const { test } = require('bare-tap')
const { Image, Text, View } = require('..')

test('children are appended, inserted and removed in order', (t) => {
  const parent = new View()
  const a = new View()
  const b = new View()
  const c = new View()

  t.teardown(() => parent.destroy())

  parent.appendChild(a)
  parent.appendChild(c)
  parent.insertBefore(b, c)

  t.deepStrictEqual(parent.children, [a, b, c])
  t.strictEqual(b.parent, parent)

  parent.removeChild(b)

  t.deepStrictEqual(parent.children, [a, c])
  t.strictEqual(b.parent, null, 'a removed child has no parent')
  t.strictEqual(b.destroyed, false, 'and is not destroyed')

  parent.insertChild(b, 0)

  t.deepStrictEqual(parent.children, [b, a, c])
})

test('children is a copy', (t) => {
  const parent = new View()

  t.teardown(() => parent.destroy())

  parent.appendChild(new View())

  parent.children.pop()

  t.strictEqual(parent.children.length, 1)
})

test('destroying a node destroys its descendants and detaches it', (t) => {
  const root = new View()
  const parent = new View()
  const child = new View()

  t.teardown(() => root.destroy())

  root.appendChild(parent)
  parent.appendChild(child)

  parent.destroy()

  t.ok(parent.destroyed)
  t.ok(child.destroyed, 'the descendant too')
  t.deepStrictEqual(root.children, [], 'and it is gone from its parent')
})

test('invalid insertions throw', (t) => {
  const parent = new View()
  const stranger = new View()

  t.teardown(() => {
    parent.destroy()
    stranger.destroy()
  })

  t.throws(() => parent.appendChild(parent), /cannot contain itself/)
  t.throws(() => parent.insertChild(new View(), 5), /out of range/)
  t.throws(() => parent.insertBefore(new View(), stranger), /not a child/)
})

test('a leaf cannot contain nodes', (t) => {
  const image = new Image()
  const text = new Text('a')

  t.teardown(() => {
    image.destroy()
    text.destroy()
  })

  t.throws(() => image.appendChild(new View()), /cannot contain children/)
  t.throws(() => text.appendChild(new View()))
})
