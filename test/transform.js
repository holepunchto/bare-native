const { test } = require('bare-tap')
const { afterAnimationFrame } = require('bare-animation-frame')
const { View } = require('..')
const { mount, near, view } = require('./helpers')

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

// TEMPORARY: diagnoses translations that are not measured after a frame on
// Windows.
const settled = {}
const timeline = []

if (Bare.platform === 'win32') {
  const CompositionTarget = require('bare-win-ui/composition-target')

  const { _onrendering, on, off } = CompositionTarget

  CompositionTarget._onrendering = function (renderingTime) {
    timeline.push([Date.now(), `rendering ${renderingTime.toFixed(3)}`])

    return _onrendering.call(this, renderingTime)
  }

  CompositionTarget.on = function (name, fn) {
    if (name === 'rendering') timeline.push([Date.now(), 'subscribe'])

    return on.call(this, name, fn)
  }

  CompositionTarget.off = function (name, fn) {
    if (name === 'rendering') timeline.push([Date.now(), 'unsubscribe'])

    return off.call(this, name, fn)
  }
}

async function frame(child, label, expected) {
  if (Bare.platform !== 'win32') {
    await afterAnimationFrame()

    return child.measure()
  }

  const WinUIElementCompositionPreview = require('bare-win-ui/element-composition-preview')

  const visual = WinUIElementCompositionPreview.getElementVisual(child.native)
  const start = Date.now()
  const lines = []

  const log = (...args) =>
    lines.push(['DIAGNOSTIC', label, `${Date.now() - start}ms`, ...args].join(' '))

  const matches = (measured) =>
    Object.keys(expected).every((key) => Math.abs(measured[key] - expected[key]) <= 1)

  const sample = (name) => {
    const measured = child.measure()

    log(
      name,
      JSON.stringify({ pageX: measured.pageX, pageY: measured.pageY }),
      'matrix',
      JSON.stringify(visual.transformMatrix)
    )

    return measured
  }

  sample('immediately')

  await afterAnimationFrame()

  const first = sample('frame 1')

  let frames = 1

  if (!matches(first)) {
    for (frames = 2; frames <= 10; frames++) {
      await afterAnimationFrame()

      if (matches(sample(`frame ${frames}`))) break
    }

    for (const [time, event] of timeline) {
      if (time >= start - 100) log('timeline', `${time - start}ms`, event)
    }

    for (const line of lines) console.log(line)
  }

  settled[frames] = (settled[frames] || 0) + 1

  return first
}

// TEMPORARY: repeats the translations to catch the Windows flake.
for (let round = 0; round < (Bare.platform === 'win32' ? 20 : 1); round++) {
  test('a translation moves where a node lands in the window', async (t) => {
    const child = view({ width: 10, height: 10 })
    const root = view({ padding: 10 }, [child])

    await mount(t, root)

    const before = child.measure().pageX

    child.style = { width: 10, height: 10, transform: [{ translateX: 30 }] }

    const after = await frame(child, `translation ${round}`, { pageX: before + 30 })

    near(t, after.pageX, before + 30)
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

    const after = await frame(child, `percentage ${round}`, {
      pageX: before.pageX - 20,
      pageY: before.pageY + 10
    })

    near(t, after.pageX, before.pageX - 20)
    near(t, after.pageY, before.pageY + 10)
  })
}

test(
  'TEMPORARY: frames until translations were measured',
  { skip: Bare.platform !== 'win32' },
  (t) => {
    console.log('DIAGNOSTIC settled', JSON.stringify(settled))

    t.pass()
  }
)
