const { test } = require('bare-tap')
const AnimationFrameProvider = require('bare-animation-frame')
const EventEmitter = require('bare-events')
const { ScrollView, Text, View } = require('..')
const overlay = require('../lib/overlay')
const { pointer } = require('./helpers')

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

function button(node, label) {
  if (
    node instanceof View &&
    node.children.some((child) => child instanceof Text && child.text === label)
  ) {
    return node
  }

  for (const child of node.children) {
    const found = button(child, label)

    if (found !== null) return found
  }

  return null
}

// The overlay lays out and draws on the next frame of its own window.
async function press(t, shown, label) {
  const node = button(shown.window.contentView, label)

  await new AnimationFrameProvider(node.native).afterAnimationFrame()

  // TEMPORARY: diagnoses dropped overlay presses on the macOS runner.
  if (Bare.platform === 'darwin') {
    const AppKitApplication = require('bare-app-kit/application')
    const view = node.native
    const window = view.window
    const root = shown.window.contentView.native
    const start = Date.now()
    const lines = []
    let released = false

    const state = () => {
      const key = AppKitApplication.keyWindow

      return JSON.stringify({
        ms: Date.now() - start,
        active: AppKitApplication.active,
        key: window.keyWindow,
        main: window.mainWindow,
        visible: window.visible,
        windowNumber: window.windowNumber,
        appKey: key ? key.windowNumber : null
      })
    }

    const log = (...args) => lines.push(['DIAGNOSTIC', label, ...args].join(' '))

    log('before', state())

    for (const [name, target] of [
      ['button', view],
      ['root', root]
    ]) {
      target.on('mouseDown', (e) => log(name, 'mouseDown', state(), JSON.stringify(e)))
      target.on('mouseUp', (e) => log(name, 'mouseUp', state(), JSON.stringify(e)))
    }

    node.on('pointerdown', () => log('pointerdown', state()))
    node.on('pointerup', () => {
      released = true
      log('pointerup', state())
    })

    try {
      await pointer(t).tap(node)
    } catch (err) {
      log('threw', err.message)
    }

    log('after', state())

    if (!released) for (const line of lines) console.log(line)

    return
  }

  await pointer(t).tap(node)
}

function trace(node) {
  if (node instanceof ScrollView) return node

  for (const child of node.children) {
    const found = trace(child)

    if (found !== null) return found
  }

  return null
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

test('a failure with no frames has no trace', (t) => {
  const { host, shown } = setup(t)

  host.fail({ stack: 'Error: boom' })

  t.strictEqual(trace(shown.window.contentView).style.display, 'none', 'hidden')

  host.fail({ stack: 'Error: boom\n    at /app/index.js:10:3' })

  t.strictEqual(trace(shown.window.contentView).style.display, 'flex', 'shown again')
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

// TEMPORARY: repeats the presses to catch the macOS flake.
for (let round = 0; round < (Bare.platform === 'darwin' ? 20 : 1); round++) {
  test('pressing Dismiss takes the failure away', async (t) => {
    const { host, shown } = setup(t)

    host.fail({})

    await press(t, shown, 'Dismiss')

    t.strictEqual(shown.shown, false, 'hidden')

    // Android only gets the application back by reloading it.
    t.strictEqual(host.reloads, Bare.platform === 'android' ? 1 : 0, 'reloaded where it has to')
  })

  test('pressing Reload reloads the application', async (t) => {
    const { host, shown } = setup(t)

    host.fail({})

    await press(t, shown, 'Reload')

    t.strictEqual(host.reloads, 1)
  })
}
