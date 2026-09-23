const EventEmitter = require('bare-events')
const { Node: LayoutNode } = require('bare-yoga')

const style = require('./style')

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

    this._nodes = null
    this._tags = null
    this._frames = null
    this._revision = -1
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

    this._environmental = style.apply(
      this._layout,
      value,
      paint,
      this._paintable,
      this.env,
      this._style
    )

    this._style = value
    this._paint(paint)
  }

  // What the platform is covering, as CSS names it. Only a root carries it,
  // because it describes the window rather than any node in it.
  get env() {
    let node = this

    while (node._parent !== null) node = node._parent

    return node._env || style.ENV
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

    this._layout.calculateLayout(width, height)

    this.flush()
  }

  // One call reads the whole tree, and only the nodes whose layout actually
  // changed are touched afterwards.
  flush() {
    if (this._revision !== revision) this._collect()

    const nodes = this._nodes
    const frames = this._frames

    LayoutNode.readLayouts(this._tags, frames, nodes.length)

    for (let i = 0; i < nodes.length; i++) {
      const offset = i * 5

      if (frames[offset] === 0) continue

      const node = nodes[i]
      const parent = node._parent

      if (parent !== null) {
        parent._place(
          node,
          frames[offset + 1],
          frames[offset + 2],
          frames[offset + 3],
          frames[offset + 4]
        )
      }

      node._layout.clearNewLayout()
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

        node._paint(paint)
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

  // A node is placed by its parent rather than placing itself, because only
  // AppKit and UIKit keep a frame on the view. GTK stores it on a layout child
  // that belongs to the parent, WinUI sets it through an attached property on
  // the parent, and an Android view group lays its children out itself. A root
  // has no parent and takes its size from the window.
  _place(child, x, y, width, height) {
    throw new Error(`${this.constructor.name} does not implement _place`)
  }

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

function flatten(node, out) {
  out.push(node)

  for (const child of node._children) flatten(child, out)
}
