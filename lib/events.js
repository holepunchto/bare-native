// Native delivery follows a node's own listeners, for the same reason the
// platform's delivery mask does: a node nobody is watching must not pay to
// cross into JavaScript. A platform says which native event feeds which of
// ours and how to read its payload.
module.exports = function forward(node, native, events) {
  const handlers = new Map()

  node.on('newListener', (name) => {
    if (name in events === false || handlers.has(name)) return

    const [event, read] = events[name]

    // A platform reports an event either as one object or as a few numbers,
    // so the arity here is what the widest of them needs.
    const handler = (a, b, c) => node.emit(name, read(a, b, c))

    handlers.set(name, handler)

    native.on(event, handler)
  })

  // Emitted once the listener is gone, so the count is what will be left.
  node.on('removeListener', (name) => {
    if (handlers.has(name) === false || node.listenerCount(name) > 0) return

    native.off(events[name][0], handlers.get(name))

    handlers.delete(name)
  })
}
