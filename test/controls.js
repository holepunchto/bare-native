const { test } = require('bare-tap')
const { Switch, TextInput } = require('..')
const { mount, turn, view } = require('./helpers')

test('writing a value from code emits nothing', async (t) => {
  const input = new TextInput()
  const root = view({ padding: 10 }, [input])

  await mount(t, root)

  const events = []

  input.on('change', () => events.push('change'))
  input.on('selectionchange', () => events.push('selectionchange'))
  input.on('keypress', () => events.push('keypress'))

  input.value = 'hello'

  await turn()

  t.strictEqual(input.value, 'hello')
  t.deepStrictEqual(events, [])
})

test('a null value is an empty one', (t) => {
  const input = new TextInput()

  t.teardown(() => input.destroy())

  input.value = 'hello'
  input.value = null

  t.strictEqual(input.value, '')
})

test('an input cannot be both multiline and secure', (t) => {
  t.throws(
    () => new TextInput({ multiline: true, secureTextEntry: true }),
    /both multiline and secure/
  )
})

test('the shape of an input is settled when it is made', (t) => {
  const multiline = new TextInput({ multiline: true })
  const secure = new TextInput({ secureTextEntry: true })

  t.teardown(() => {
    multiline.destroy()
    secure.destroy()
  })

  t.strictEqual(multiline.multiline, true)
  t.strictEqual(multiline.secureTextEntry, false)
  t.strictEqual(secure.secureTextEntry, true)
})

test('a text input rejects a text transform', (t) => {
  const input = new TextInput()

  t.teardown(() => input.destroy())

  t.throws(() => {
    input.style = { textTransform: 'uppercase' }
  })
})

test('writing a switch from code emits nothing', async (t) => {
  const toggle = new Switch()
  const root = view({ padding: 10 }, [toggle])

  await mount(t, root)

  let changes = 0

  toggle.on('change', () => changes++)

  toggle.value = true

  await turn()

  t.strictEqual(toggle.value, true)
  t.strictEqual(changes, 0)
})

test('controls measure to a natural size', async (t) => {
  const input = new TextInput()
  const toggle = new Switch()
  const root = view({ alignItems: 'flex-start' }, [input, toggle])

  await mount(t, root)

  root.layout(400, 300)

  t.ok(input.measure().height > 0, 'a field has a height')
  t.ok(toggle.measure().width > 0, 'a switch has a width')
  t.ok(toggle.measure().height > 0, 'and a height')
})
