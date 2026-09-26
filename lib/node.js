const EventEmitter = require('bare-events')
const { Node: LayoutNode } = require('bare-yoga')

const style = require('./style')
const transform = require('./transform')

// Bumped whenever any tree changes shape, so that a root can tell its cached
// flat view of itself is stale without every node having to report upwards.
let revision = 0

module.exports = exports = class NativeNode extends EventEmitter {
  constructor() {
    super()

    this._layout = new LayoutNode()
    this._parent = null
    this._children = []

    this._style = null
    this._env = null
    this._environmental = false

    this._transform = null
    this._origin = undefined
    this._zIndex = 0
    this._layered = false
    this._width = 0
    this._height = 0

    this._nodes = null
    this._tags = null
    this._frames = null
    this._revision = -1
    this._reported = null
    this._laid = null
    this._pending = false
  }

  get native() {
    return this._native
  }

  get parent() {
    return this._parent
  }

  get children() {
    return this._children.slice()
  }

  get style() {
    return this._style
  }

  set style(value) {
    const paint = {}

    // A list is flattened here rather than by every caller, because what a
    // node keeps has to be the resolved one: a property dropped between two
    // styles is put back by comparing them, and a list cannot be compared.
    const flat = Array.isArray(value) ? style.flatten(value) : value

    this._environmental = style.apply(
      this._layout,
      flat,
      paint,
      this._paintable,
      this.env,
      this._style
    )

    this._style = flat
    this._paint(this._compose(paint))
  }

  // What the platform is covering, as CSS names it. Only a root carries it,
  // because it describes the window rather than any node in it.
  get env() {
    let node = this

    while (node._parent !== null) node = node._parent

    // Merged with the defaults rather than replacing them, because a platform
    // reports what it knows: three of the five have no software keyboard and
    // nothing to say about it, and a variable nobody reported is zero rather
    // than an error.
    return node._env === null ? style.ENV : { ...style.ENV, ...node._env }
  }

  set env(value) {
    this._env = value

    this._resolve()
  }

  appendChild(child) {
    this.insertChild(child, length(this, child))
  }

  insertChild(child, index) {
    if (child === this) throw new Error('A node cannot contain itself')

    if (!this._container) {
      throw new Error(`${this.constructor.name} cannot contain children`)
    }

    if (index < 0 || index > length(this, child)) {
      throw new RangeError(`Index ${index} is out of range`)
    }

    if (child._parent !== null) child._parent.removeChild(child)

    this._insert(child, index)

    this._children.splice(index, 0, child)
    child._parent = this

    this._layout.insertChild(child._layout, index)

    // A child arriving at the end of the list is in front of everything on a
    // platform that paints in list order, whatever its own depth is, so the
    // order is made again whenever any child has one.
    if (child._zIndex !== 0) this._layered = true

    if (this._layered) this._ordered()

    // A subtree built before it was attached resolved against nothing, so it
    // is resolved again once it can see where it landed.
    if (this.env !== style.ENV) child._resolve()

    revision++
  }

  // Placing a child relative to a sibling rather than at an index, because a
  // move detaches the child first and every index after it shifts.
  insertBefore(child, reference) {
    if (reference === null) return this.appendChild(child)

    if (!this._children.includes(reference)) {
      throw new Error('Reference is not a child of this node')
    }

    if (child === reference) return

    if (child._parent !== null) child._parent.removeChild(child)

    this.insertChild(child, this._children.indexOf(reference))
  }

  removeChild(child) {
    const index = this._children.indexOf(child)

    if (index === -1) return

    this._children.splice(index, 1)
    child._parent = null

    this._layout.removeChild(child._layout)
    this._remove(child)

    revision++
  }

  destroy() {
    while (this._children.length > 0) this._children[0].destroy()

    if (this._parent !== null) this._parent.removeChild(this)

    this._destroy()
    this._layout.destroy()
  }

  get destroyed() {
    return this._layout.tag === 0
  }

  // Lays this node out as a root and writes the result onto the native views
  // beneath it. Laying out a tree that has been taken down is a no-op, because
  // a commit can outlive the nodes it was scheduled for.
  layout(width, height) {
    if (this.destroyed) return

    this._laid = { width, height }

    this._layout.calculateLayout(width, height)

    this.flush()
  }

  // A node whose size changed for a reason the tree knows nothing about, such
  // as a picture finishing a decode the platform could not do where the source
  // was set, asks for another pass. Only a root is ever laid out, so the
  // request travels up to one, and it is laid out again at the size it was
  // given last. Several of them in the same turn are one pass rather than one
  // each, which is what a screen of pictures arriving at once costs.
  _relayout() {
    let root = this

    while (root._parent !== null) root = root._parent

    if (root._laid === null || root._pending) return

    root._pending = true

    queueMicrotask(() => {
      root._pending = false

      if (!root.destroyed) root.layout(root._laid.width, root._laid.height)
    })
  }

  // One call reads the whole tree, and only the nodes whose layout actually
  // changed are touched afterwards.
  flush() {
    if (this._revision !== revision) this._collect()

    const nodes = this._nodes
    const frames = this._frames

    LayoutNode.readLayouts(this._tags, frames, nodes.length)

    let pending = null

    for (let i = 0; i < nodes.length; i++) {
      const offset = i * 5
      const node = nodes[i]

      // A transform sits on top of the geometry a platform was given, and a
      // platform writes geometry of its own accord as well: AppKit clears a
      // layer-backed view's transform every time it sets the frame, its own
      // display pass included. So it is written again on every pass rather
      // than only when the box moves.
      if (frames[offset] === 0) {
        if (node._transform !== null) node._paint(node._transformed())

        continue
      }

      const parent = node._parent
      const x = frames[offset + 1]
      const y = frames[offset + 2]
      const width = frames[offset + 3]
      const height = frames[offset + 4]

      if (node._transform !== null) node._untransform()

      if (parent !== null) parent._place(node, x, y, width, height)

      node._width = width
      node._height = height

      node._resized(width, height)

      if (node._transform !== null) node._paint(node._transformed())

      node._layout.clearNewLayout()

      if (node.listenerCount('layout') > 0 && moved(node._reported, x, y, width, height)) {
        node._reported = { x, y, width, height }

        if (pending === null) pending = []

        pending.push(node, node._reported)
      }
    }

    if (pending === null) return

    // Delivered once the pass is over, because a listener may take nodes out
    // of the tree and the pass is walking a snapshot of it.
    for (let i = 0; i < pending.length; i += 2) {
      const node = pending[i]

      if (!node.destroyed) node.emit('layout', pending[i + 1])
    }
  }

  // Re-resolves the nodes that referred to the environment. A painted length
  // can refer to it as a laid-out one can, so this repaints them rather than
  // only laying them out again.
  _resolve() {
    const env = this.env

    const resolve = (node) => {
      if (node._environmental) {
        const paint = {}

        style.apply(node._layout, node._style, paint, node._paintable, env)

        node._paint(node._compose(paint))
      }

      for (const child of node._children) resolve(child)
    }

    resolve(this)
  }

  _collect() {
    const nodes = []

    flatten(this, nodes)

    this._nodes = nodes
    this._tags = new Uint32Array(nodes.length)
    this._frames = new Float64Array(nodes.length * 5)

    for (let i = 0; i < nodes.length; i++) this._tags[i] = nodes[i]._layout.tag

    this._revision = revision
  }

  // A transform resolves against the node's box, which the style layer knows
  // nothing about: unless an origin is given it is the middle of that box. So
  // the matrix is composed here, and resolved again whenever the box moves.
  _compose(paint) {
    // Where a box sits against its siblings is the parent's business on a
    // platform with no depth of its own, so the parent is told rather than the
    // box painting it.
    if ('zIndex' in paint && paint.zIndex !== this._zIndex) {
      this._zIndex = paint.zIndex

      const parent = this._parent

      if (parent !== null) {
        if (paint.zIndex !== 0) parent._layered = true

        if (parent._layered) parent._ordered()
      }
    }

    if ('transform' in paint || 'transformOrigin' in paint) {
      if ('transform' in paint) this._transform = transform.compose(paint.transform)
      if ('transformOrigin' in paint) this._origin = paint.transformOrigin

      Object.assign(paint, this._transformed())
    }

    return paint
  }

  // What a platform is told: the matrix, and where it is applied from in
  // points. A toolkit with a pivot of its own uses the origin as one, and a
  // toolkit with none folds it into the matrix.
  _transformed() {
    if (this._transform === null) return { transform: null, transformOrigin: null }

    return {
      transform: this._transform,
      transformOrigin: transform.origin(this._origin, this._width, this._height)
    }
  }

  // The platform hooks.

  // Which non-layout properties this primitive understands. Anything else in a
  // style object is a typo and is reported as one.
  get _paintable() {
    return style.PAINT
  }

  // Whether this primitive can hold other nodes. A leaf declares it here
  // rather than refusing in each platform file, because it is a leaf on every
  // platform.
  get _container() {
    return true
  }

  // Called before the child joins the list, so a platform reading the list
  // sees the siblings the child lands between rather than the child itself.
  _insert(child, index) {
    throw new Error(`${this.constructor.name} does not implement _insert`)
  }

  _remove(child) {
    throw new Error(`${this.constructor.name} does not implement _remove`)
  }

  // Called when a child's depth changes, for a platform whose paint order is
  // the order a parent holds its children in. Everywhere else a box says its
  // own depth and nothing above the platform files has to know.
  _ordered() {}

  // A node is placed by its parent rather than placing itself, because only
  // AppKit and UIKit keep a frame on the view. GTK stores it on a layout child
  // that belongs to the parent, WinUI sets it through an attached property on
  // the parent, and an Android view group lays its children out itself. A root
  // has no parent and takes its size from the window.
  _place(child, x, y, width, height) {
    throw new Error(`${this.constructor.name} does not implement _place`)
  }

  // Called before this node's box is written, for a platform on which the two
  // cannot both be true at once. The Apple platforms derive a view's frame
  // from its bounds and its transform together, so a transform has to come off
  // first; nowhere else is this anything.
  _untransform() {}

  // Told to a node about its own box, which `_place` cannot be: a root is never
  // placed, and a primitive that has to size something inside itself needs the
  // measurement whether or not it has a parent.
  _resized(width, height) {}

  _paint(properties) {
    throw new Error(`${this.constructor.name} does not implement _paint`)
  }

  _destroy() {}
}

// The length the list has once a child already in it has been detached, which
// is both the range an index is checked against and where an append lands.
function length(parent, child) {
  return parent._children.length - (child._parent === parent ? 1 : 0)
}

// `hasNewLayout` says a node's layout was written during a pass, not that it
// differs from the last one, and a root is written on every pass. A frame is
// compared against the one last delivered rather than taken as a change.
function moved(frame, x, y, width, height) {
  return (
    frame === null ||
    frame.x !== x ||
    frame.y !== y ||
    frame.width !== width ||
    frame.height !== height
  )
}

function flatten(node, out) {
  out.push(node)

  for (const child of node._children) flatten(child, out)
}
