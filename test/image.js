const { test } = require('bare-tap')
const { Image } = require('..')
const { mount, view } = require('./helpers')

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
