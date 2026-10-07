const { test } = require('bare-tap')
const { Image, StyleSheet, Text, View } = require('..')

test('a style sheet freezes what it is given', (t) => {
  const styles = StyleSheet.create({ box: { width: 10 } })

  t.ok(Object.isFrozen(styles), 'the sheet')
  t.ok(Object.isFrozen(styles.box), 'and each style')
  t.equal(styles.box.width, 10)
})

test('a style sheet rejects an unknown property where it is written', (t) => {
  t.throws(
    () => StyleSheet.create({ box: { widht: 10 } }),
    /Unknown style property 'widht' in 'box'/
  )
})

test('flattening lets later entries win and skips empty ones', (t) => {
  const flat = StyleSheet.flatten([{ width: 1, height: 2 }, null, false, [{ width: 3 }]])

  t.deepStrictEqual(flat, { width: 3, height: 2 })
})

test('a node keeps its style flattened', (t) => {
  const view = new View()

  t.teardown(() => view.destroy())

  view.style = [{ width: 1, opacity: 0.5 }, { width: 2 }]

  t.deepStrictEqual(view.style, { width: 2, opacity: 0.5 })
})

test('a node rejects an unknown property', (t) => {
  const view = new View()

  t.teardown(() => view.destroy())

  t.throws(() => {
    view.style = { colour: 'red' }
  }, /Unknown style property 'colour'/)
})

test('a node rejects a property that does not apply to it', (t) => {
  const image = new Image()
  const view = new View()

  t.teardown(() => {
    image.destroy()
    view.destroy()
  })

  t.throws(
    () => {
      image.style = { overflow: 'hidden' }
    },
    /does not apply/,
    'overflow on an image'
  )

  t.throws(
    () => {
      view.style = { fontSize: 12 }
    },
    /does not apply/,
    'a text property on a view'
  )
})

test('a node rejects a value it cannot read', (t) => {
  const view = new View()
  const text = new Text('a')

  t.teardown(() => {
    view.destroy()
    text.destroy()
  })

  t.throws(
    () => {
      view.style = { backgroundColor: 'nope' }
    },
    /as a colour/,
    'a colour'
  )

  t.throws(
    () => {
      view.style = { width: 'wide' }
    },
    /as a length/,
    'a length'
  )

  t.throws(
    () => {
      view.style = { paddingTop: 'env(notch)' }
    },
    /Unknown environment variable/,
    'an environment variable'
  )

  t.throws(
    () => {
      text.style = { fontWeight: 'heavy' }
    },
    /as a font weight/,
    'a font weight'
  )
})
