const { test } = require('bare-tap')
const { afterAnimationFrame } = require('bare-animation-frame')
const { ActivityIndicator, Switch, TextInput } = require('..')
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

test('focusing and blurring an input is reported', async (t) => {
  const input = new TextInput()
  const root = view({ padding: 10 }, [input])

  await mount(t, root)

  const events = []

  input.on('focus', () => events.push('focus'))
  input.on('blur', () => events.push('blur'))

  input.focus()

  await afterAnimationFrame()

  input.blur()

  await afterAnimationFrame()

  t.deepStrictEqual(events, ['focus', 'blur'])
})

test('a selection is read back from a focused input', async (t) => {
  const input = new TextInput()
  const root = view({ padding: 10 }, [input])

  await mount(t, root)

  input.value = 'hello'
  input.focus()

  await afterAnimationFrame()

  input.selection = { start: 1, end: 3 }

  t.deepStrictEqual(input.selection, { start: 1, end: 3 })

  input.selection = { start: 2 }

  t.deepStrictEqual(input.selection, { start: 2, end: 2 }, 'a caret is an empty selection')

  input.blur()
})

test('input hints default and validate', (t) => {
  const input = new TextInput()

  t.teardown(() => input.destroy())

  t.strictEqual(input.keyboardType, 'default')
  t.strictEqual(input.editable, true)
  t.strictEqual(input.autoCorrect, true)
  t.strictEqual(input.focusRing, true)

  input.keyboardType = 'email-address'
  input.placeholder = 'Email'
  input.editable = false

  t.strictEqual(input.keyboardType, 'email-address')
  t.strictEqual(input.placeholder, 'Email')
  t.strictEqual(input.editable, false)

  input.placeholder = null

  t.strictEqual(input.placeholder, '', 'a null placeholder is an empty one')

  t.throws(() => {
    input.keyboardType = 'emoji'
  }, /Unknown value 'emoji' for 'keyboardType'/)
})

test('a switch can be disabled', (t) => {
  const toggle = new Switch()

  t.teardown(() => toggle.destroy())

  t.strictEqual(toggle.enabled, true)

  toggle.enabled = false

  t.strictEqual(toggle.enabled, false)
})

test('an activity indicator has a natural size', (t) => {
  const small = new ActivityIndicator()
  const large = new ActivityIndicator()

  large.size = 'large'

  const root = view({ alignItems: 'flex-start' }, [small, large])

  t.teardown(() => root.destroy())

  root.layout(400, 400)

  t.strictEqual(small.size, 'small')
  t.strictEqual(small.animating, true)
  t.ok(small.measure().width > 0, 'a small one has a width')
  t.ok(large.measure().width >= small.measure().width, 'and a large one is no smaller')

  t.throws(() => {
    small.size = 'huge'
  }, /Unknown value 'huge' for 'size'/)
})
