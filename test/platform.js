const { test } = require('bare-tap')
const { afterAnimationFrame } = require('bare-animation-frame')
const { Appearance, Clipboard, Keyboard } = require('..')
const { mount, view } = require('./helpers')

// Android applies a declared scheme at most once per run.
test(
  'a declared color scheme is the one read back',
  { skip: Bare.platform === 'android' },
  async (t) => {
    await mount(t, view({ flex: 1 }))

    t.teardown(() => Appearance.setColorScheme(null))

    Appearance.setColorScheme('dark')

    await afterAnimationFrame()

    t.strictEqual(Appearance.getColorScheme(), 'dark')

    Appearance.setColorScheme('light')

    await afterAnimationFrame()

    t.strictEqual(Appearance.getColorScheme(), 'light')
  }
)

test('no keyboard covers a window nobody is typing in', async (t) => {
  await mount(t, view({ flex: 1 }))

  t.strictEqual(Keyboard.height, 0)
  t.strictEqual(Keyboard.isVisible(), false)
  t.doesNotThrow(() => Keyboard.dismiss(), 'and dismissing it is harmless')
})

// The clipboard belongs to whoever runs the tests.
test('text written to the clipboard is read back', async (t) => {
  await mount(t, view({ flex: 1 }))

  const before = await Clipboard.getString()

  t.teardown(() => Clipboard.setString(before))

  Clipboard.setString('bare-native')

  t.strictEqual(await Clipboard.hasString(), true)
  t.strictEqual(await Clipboard.getString(), 'bare-native')
})
