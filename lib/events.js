// Native delivery follows a node's own listeners, for the same reason the
// platform's delivery mask does: a node nobody is watching must not pay to
// cross into JavaScript. A platform says which native event feeds which of
// ours and how to read its payload.
//
// Returns a switch for the whole set, because a platform whose only way of
// saying a box is not a target is to stop answering for it needs one: an
// Android view whose touch mask is down lets the event reach whatever is
// behind it, which is what the other four say with a property.
module.exports = function forward(node, native, events) {
  const handlers = new Map()

  let listening = true

  node.on('newListener', (name) => {
    if (name in events === false || handlers.has(name)) return

    const [event, read] = events[name]

    // A platform reports an event either as one object or as a few numbers,
    // so the arity here is what the widest of them needs.
    const handler = (a, b, c) => node.emit(name, read(a, b, c))

    handlers.set(name, handler)

    if (listening) native.on(event, handler)
  })

  // Emitted once the listener is gone, so the count is what will be left.
  node.on('removeListener', (name) => {
    if (handlers.has(name) === false || node.listenerCount(name) > 0) return

    if (listening) native.off(events[name][0], handlers.get(name))

    handlers.delete(name)
  })

  return function listen(enabled) {
    if (enabled === listening) return

    listening = enabled

    for (const [name, handler] of handlers) {
      if (enabled) native.on(events[name][0], handler)
      else native.off(events[name][0], handler)
    }
  }
}
