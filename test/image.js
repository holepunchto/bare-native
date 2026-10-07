const { test } = require('bare-tap')
const { Image } = require('..')
const { mount, view } = require('./helpers')

const fixture = require.asset('./fixtures/image.png', __filename)

function loaded(image) {
  return new Promise((resolve, reject) => {
    image.once('load', resolve).once('error', reject)
  })
}

test('an image that cannot be read reports an error a turn later', async (t) => {
  const image = new Image()
  const root = view({}, [image])

  await mount(t, root)

  let reported = false

  const error = new Promise((resolve) => {
    image.on('error', (err) => {
      reported = true

      resolve(err)
    })
  })

  image.source = '/this/file/does/not/exist.png'

  t.strictEqual(reported, false, 'not from the setter')

  const err = await error

  t.ok(err instanceof Error)
  t.strictEqual(image.intrinsicSize, null, 'and there is no size')
})

test('an image with nobody listening for errors does not throw', async (t) => {
  const image = new Image()
  const root = view({}, [image])

  await mount(t, root)

  image.source = '/this/file/does/not/exist.png'

  await new Promise((resolve) => setTimeout(resolve, 100))

  t.pass('nothing was thrown')
})

test('a source must be a path', (t) => {
  const image = new Image()

  t.teardown(() => image.destroy())

  t.throws(() => {
    image.source = 42
  }, /path of a file/)
})

test('a decoded image reports its natural size a turn later', async (t) => {
  const image = new Image()
  const root = view({ alignItems: 'flex-start' }, [image])

  await mount(t, root)

  t.strictEqual(image.intrinsicSize, null, 'no size before a source')

  const load = loaded(image)

  image.source = fixture

  t.deepStrictEqual(await load, { width: 40, height: 20 }, 'the size of the file')
  t.deepStrictEqual(image.intrinsicSize, { width: 40, height: 20 })
  t.strictEqual(image.source, fixture)
})

test('an image left to size itself takes its natural size', async (t) => {
  const image = new Image()
  const root = view({ alignItems: 'flex-start' }, [image])

  await mount(t, root)

  const load = loaded(image)

  image.source = fixture

  await load

  root.layout(400, 300)

  const { width, height } = image.measure()

  t.deepStrictEqual({ width, height }, { width: 40, height: 20 })
})

test('an image given one side keeps its ratio', async (t) => {
  const wide = new Image()
  const tall = new Image()
  const root = view({ alignItems: 'flex-start' }, [wide, tall])

  wide.style = { width: 100 }
  tall.style = { height: 10 }

  await mount(t, root)

  const loads = [loaded(wide), loaded(tall)]

  wide.source = fixture
  tall.source = fixture

  await Promise.all(loads)

  root.layout(400, 300)

  t.strictEqual(wide.measure().height, 50, 'a width sets the height')
  t.strictEqual(tall.measure().width, 20, 'a height sets the width')
})

test('an image only reports the source it was given last', async (t) => {
  const image = new Image()
  const root = view({}, [image])

  await mount(t, root)

  const events = []

  image.on('load', () => events.push('load'))
  image.on('error', () => events.push('error'))

  const load = loaded(image)

  image.source = '/this/file/does/not/exist.png'
  image.source = fixture

  await load

  await new Promise((resolve) => setTimeout(resolve, 100))

  t.deepStrictEqual(events, ['load'])
})

test('clearing the source takes the size away', async (t) => {
  const image = new Image()
  const root = view({ alignItems: 'flex-start' }, [image])

  await mount(t, root)

  const load = loaded(image)

  image.source = fixture

  await load

  image.source = null

  root.layout(400, 300)

  t.strictEqual(image.intrinsicSize, null, 'no size')
  t.strictEqual(image.measure().width, 0, 'and no box')
})

test('an image rejects a resize mode it does not know', (t) => {
  const image = new Image()

  t.teardown(() => image.destroy())

  t.doesNotThrow(() => {
    image.style = { resizeMode: 'contain' }
  })

  t.throws(() => {
    image.style = { resizeMode: 'tile' }
  }, /Unknown value 'tile' for style property 'resizeMode'/)
})
