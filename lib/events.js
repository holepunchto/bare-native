// Native listeners are attached only while the node has listeners of its
// own, so an unobserved node never crosses into JavaScript.
//
// The returned switch is for Android, where a view stops being a hit target
// only by no longer handling touches.
module.exports = function forward(node, native, events) {
  const handlers = new Map()

  let listening = true

  node.on('newListener', (name) => {
    if (name in events === false || handlers.has(name)) return

    const [event, read] = events[name]

    // A platform passes either one object or up to three numbers.
    const handler = (a, b, c) => node.emit(name, read(a, b, c))

    handlers.set(name, handler)

    if (listening) native.on(event, handler)
  })

  // Emitted after removal, so the count excludes the removed listener.
  node.on('removeListener', (name) => {
    if (handlers.has(name) === false || node.listenerCount(name) > 0) return

    if (listening) native.off(events[name][0], handlers.get(name))

    handlers.delete(name)
  })

  return function (enabled) {
    if (enabled === listening) return

    listening = enabled

    for (const [name, handler] of handlers) {
      if (enabled) native.on(events[name][0], handler)
      else native.off(events[name][0], handler)
    }
  }
}
