const { test } = require('bare-tap')
const { Appearance, Dimensions } = require('..')
const { mount, near, view } = require('./helpers')

test('a window lays out its content at its size', async (t) => {
  const root = view({ flex: 1 })

  const window = await mount(t, root)

  const { width, height } = window.size

  t.ok(width > 0 && height > 0, 'the window has room')

  const measured = root.measure()

  near(t, measured.width, width)
  near(t, measured.height, height)
})

test('content that replaces destroyed content is laid out at the size of the window', async (t) => {
  const destroyed = view({ flex: 1 })

  const window = await mount(t, destroyed)

  destroyed.destroy()

  const root = view({ flex: 1 })

  await mount(t, root)

  const { width, height } = window.size

  t.ok(width > 0 && height > 0, 'the window has room')

  const measured = root.measure()

  near(t, measured.width, width)
  near(t, measured.height, height)
})

test('the window dimensions are the size of the window', async (t) => {
  const window = await mount(t, view({ flex: 1 }))

  const { width, height, scale, fontScale } = Dimensions.get('window')

  t.strictEqual(width, window.size.width)
  t.strictEqual(height, window.size.height)
  t.ok(scale > 0, 'a scale')
  t.ok(fontScale > 0, 'and a font scale')
})

test('the screen is at least as large as the window', async (t) => {
  const window = await mount(t, view({ flex: 1 }))

  const screen = Dimensions.get('screen')

  t.ok(screen.width >= window.size.width)
  t.ok(screen.height >= window.size.height)
})

test('the color scheme is light or dark', async (t) => {
  await mount(t, view({ flex: 1 }))

  t.ok(['light', 'dark'].includes(Appearance.getColorScheme()))
})

test('the environment defaults to zero', (t) => {
  const node = view()

  t.teardown(() => node.destroy())

  t.strictEqual(node.env['keyboard-inset-height'], 0)
})
