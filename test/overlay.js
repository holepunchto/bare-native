const { test } = require('bare-tap')
const EventEmitter = require('bare-events')
const { Text } = require('..')
const overlay = require('../lib/overlay')

class Host extends EventEmitter {
  constructor() {
    super()

    this.running = true
    this.reloads = 0
  }

  reload() {
    this.reloads++

    return Promise.resolve()
  }

  fail(report) {
    this.emit('error', new Error(), {
      phase: 'evaluate',
      href: '/app/index.js',
      intact: false,
      name: 'Error',
      message: 'boom',
      stack: null,
      ...report
    })
  }
}

function setup(t) {
  const host = new Host()
  const shown = overlay(host)

  t.teardown(() => host.emit('reload'))

  return { host, shown }
}

function drawn(node) {
  const texts = node instanceof Text ? [node.text] : []

  for (const child of node.children) texts.push(...drawn(child))

  return texts
}

test('a failure is shown with where it happened and what it left', (t) => {
  const { host, shown } = setup(t)

  host.fail({ message: 'boom' })

  t.ok(shown.shown)

  const texts = drawn(shown.window.contentView)

  t.ok(texts.includes('Evaluation error'), 'the phase')
  t.ok(texts.includes('/app/index.js'), 'the module')
  t.ok(texts.includes('Error: boom'), 'the message')
  t.ok(texts.includes('Nothing is running until an edit fixes this.'), 'what it left')
})

test('a failure that left the application running says so', (t) => {
  const { host, shown } = setup(t)

  host.fail({ phase: 'compile', intact: true })

  const texts = drawn(shown.window.contentView)

  t.ok(texts.includes('Compile error'))
  t.ok(texts.includes('The application is still running.'))
})

test('a failure in an unknown phase is shown as an error', (t) => {
  const { host, shown } = setup(t)

  host.fail({ phase: 'elsewhere' })

  t.ok(drawn(shown.window.contentView).includes('Error'))
})

test('a transport failure is not shown', (t) => {
  const { host, shown } = setup(t)

  host.fail({ phase: 'transport' })

  t.strictEqual(shown.shown, false)
  t.strictEqual(shown.window, null, 'and no window is made for it')
})

test('the trace keeps the frames of the application', (t) => {
  const { host, shown } = setup(t)

  host.fail({
    stack: [
      'Error: boom',
      '    at /app/lib/page.js:3:9',
      '    at load (/app/node_modules/dep/index.js:1:1)',
      '    at ScriptModule._execute (file:///runtime/bare-module/lib/module.js:21:5)',
      '    at /app/index.js:10:3'
    ].join('\n')
  })

  const texts = drawn(shown.window.contentView)

  t.ok(texts.includes('at /app/lib/page.js:3:9\nat /app/index.js:10:3'))
})

test('the trace keeps dependency frames when the application has none', (t) => {
  const { host, shown } = setup(t)

  host.fail({
    stack: [
      'Error: boom',
      '    at load (/app/node_modules/dep/index.js:1:1)',
      '    at ScriptModule._execute (file:///runtime/bare-module/lib/module.js:21:5)'
    ].join('\n')
  })

  t.ok(drawn(shown.window.contentView).includes('at load (/app/node_modules/dep/index.js:1:1)'))
})

test('a second failure replaces the first', (t) => {
  const { host, shown } = setup(t)

  host.fail({ message: 'first' })
  host.fail({ message: 'second', name: 'TypeError' })

  const texts = drawn(shown.window.contentView)

  t.ok(texts.includes('TypeError: second'))
  t.notOk(texts.includes('Error: first'))
})

test('a refresh that lands takes the failure away', (t) => {
  const { host, shown } = setup(t)

  host.fail({})
  host.emit('refresh')

  t.strictEqual(shown.shown, false)

  // Android only gets the application back by reloading it.
  t.strictEqual(host.reloads, Bare.platform === 'android' ? 1 : 0)
})

test('a reload that lands takes the failure away without reloading again', (t) => {
  const { host, shown } = setup(t)

  host.fail({})
  host.emit('reload')

  t.strictEqual(shown.shown, false)
  t.strictEqual(host.reloads, 0)
})

test('hiding with nothing shown does nothing', (t) => {
  const { host, shown } = setup(t)

  host.emit('refresh')

  t.strictEqual(shown.shown, false)
  t.strictEqual(host.reloads, 0)
})

test('a failure after the overlay was taken away is shown again', (t) => {
  const { host, shown } = setup(t)

  host.fail({ message: 'first' })
  host.emit('reload')
  host.fail({ message: 'second' })

  t.ok(shown.shown)
  t.ok(drawn(shown.window.contentView).includes('Error: second'))
})
