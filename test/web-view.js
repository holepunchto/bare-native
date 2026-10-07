const { test } = require('bare-tap')
const { WebView } = require('..')
const { mount, view } = require('./helpers')

test('a page loaded from markup forgets the URL and the other way around', async (t) => {
  const web = new WebView()
  const root = view({ flex: 1 }, [web])

  await mount(t, root)

  t.strictEqual(web.url, null, 'no URL')
  t.strictEqual(web.html, null, 'and no markup')

  web.url = 'about:blank'

  t.strictEqual(web.url, 'about:blank')

  web.html = '<p>Hello</p>'

  t.strictEqual(web.html, '<p>Hello</p>')
  t.strictEqual(web.url, null, 'the URL is forgotten')

  web.url = 'about:blank'

  t.strictEqual(web.html, null, 'the markup is forgotten')
})

test('clearing the URL leaves the page as it is', (t) => {
  const web = new WebView()

  t.teardown(() => web.destroy())

  web.html = '<p>Hello</p>'
  web.url = null

  t.strictEqual(web.html, '<p>Hello</p>')
})

test('a URL and markup must be strings', (t) => {
  const web = new WebView()

  t.teardown(() => web.destroy())

  t.throws(() => {
    web.url = 42
  }, /A URL is a string/)

  t.throws(() => {
    web.html = 42
  }, /HTML is a string/)
})

test('a page is not inspectable unless asked', (t) => {
  const web = new WebView()

  t.teardown(() => web.destroy())

  t.strictEqual(web.inspectable, false)

  web.inspectable = true

  t.strictEqual(web.inspectable, true)

  web.inspectable = null

  t.strictEqual(web.inspectable, false, 'anything but true is false')
})

test('a web view is a box laid out like any other', async (t) => {
  const web = new WebView()
  const root = view({ padding: 10 }, [web])

  web.style = { flex: 1 }

  await mount(t, root)

  root.layout(400, 300)

  const { x, y, width, height } = web.measure()

  t.deepStrictEqual({ x, y, width, height }, { x: 10, y: 10, width: 380, height: 280 })
})
