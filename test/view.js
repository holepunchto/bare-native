const { test } = require('bare-tap')
const { Text } = require('..')
const { mount, near, pointer, view } = require('./helpers')

const TYPE = Bare.platform === 'ios' || Bare.platform === 'android' ? 'touch' : 'mouse'

function box(style = {}, children = []) {
  return view(
    { position: 'absolute', left: 40, top: 30, width: 200, height: 150, ...style },
    children
  )
}

function record(node, events, name = '') {
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    node.on(type, (event) => events.push({ name, type, ...event }))
  }
}

async function setup(t, root) {
  await mount(t, root)

  return pointer(t)
}

test('a press reports where it lands and what made it', async (t) => {
  const target = box()
  const press = await setup(t, view({ flex: 1 }, [target]))

  const events = []

  record(target, events)

  await press.down(target, 10, 20)
  await press.move(target, 50, 60)
  await press.up()

  t.deepStrictEqual(
    events.map((event) => event.type),
    ['pointerdown', 'pointermove', 'pointerup'],
    'a press, a move and a release'
  )

  near(t, events[0], { x: 10, y: 20 }, 'pressed at the point')
  near(t, events[1], { x: 50, y: 60 }, 'moved to the point')
  near(t, events[2], { x: 50, y: 60 }, 'released where it moved to')

  t.ok(
    events.every((event) => event.pointerType === TYPE),
    `made by a ${TYPE}`
  )
  t.ok(
    events.every((event) => event.pointerId === events[0].pointerId),
    'by one pointer'
  )
})

test('a drag keeps reporting to the view it started in', async (t) => {
  const target = box({ width: 100, height: 100 })
  const press = await setup(t, view({ flex: 1 }, [target]))

  const events = []

  record(target, events)

  await press.down(target, 50, 50)
  await press.move(target, 150, 120)
  await press.up()

  t.deepStrictEqual(
    events.map((event) => event.type),
    ['pointerdown', 'pointermove', 'pointerup'],
    'all of it'
  )

  near(t, events[2], { x: 150, y: 120 }, 'outside the view')
})

test('the innermost listening view takes a press', async (t) => {
  const inner = view({ position: 'absolute', left: 20, top: 20, width: 60, height: 60 })
  const outer = box({}, [inner])
  const press = await setup(t, view({ flex: 1 }, [outer]))

  const events = []

  record(outer, events, 'outer')
  record(inner, events, 'inner')

  await press.tap(inner)

  t.deepStrictEqual(
    events.map((event) => [event.name, event.type]),
    [
      ['inner', 'pointerdown'],
      ['inner', 'pointerup']
    ]
  )
})

test('a press on a view nobody listens to goes to the view around it', async (t) => {
  const inner = view({ position: 'absolute', left: 20, top: 20, width: 60, height: 60 })
  const outer = box({}, [inner])
  const press = await setup(t, view({ flex: 1 }, [outer]))

  const events = []

  record(outer, events)

  await press.tap(inner, 10, 10)

  t.deepStrictEqual(
    events.map((event) => event.type),
    ['pointerdown', 'pointerup'],
    'taken by the outer view'
  )

  near(t, events[0], { x: 30, y: 30 }, 'at the point in the outer view')
})

test('a view that takes no pointer events lets a press through', async (t) => {
  const below = box()
  const above = box({ pointerEvents: 'none' })
  const press = await setup(t, view({ flex: 1 }, [below, above]))

  const events = []

  record(below, events, 'below')
  record(above, events, 'above')

  await press.tap(above)

  t.deepStrictEqual(
    events.map((event) => [event.name, event.type]),
    [
      ['below', 'pointerdown'],
      ['below', 'pointerup']
    ]
  )
})

test('a press on text goes to the view around it', async (t) => {
  const label = new Text('Press')
  const outer = box({}, [label])
  const press = await setup(t, view({ flex: 1 }, [outer]))

  const events = []

  record(outer, events)

  await press.tap(label)

  t.deepStrictEqual(
    events.map((event) => event.type),
    ['pointerdown', 'pointerup']
  )
})
