const EventEmitter = require('bare-events')
const { Node: LayoutNode, constants } = require('bare-yoga')

const measure = require('#measure')

const anchor = require('./anchor')
const style = require('./style')
const transform = require('./transform')

// Bumped on any tree change, so a root can detect that its cached node list
// is stale without nodes reporting upwards.
let revision = 0

const HIDDEN = { opacity: 0, pointerEvents: 'none' }

module.exports = exports = class NativeNode extends EventEmitter {
  constructor() {
    super()

    this._layout = new LayoutNode()
    this._config = null
    this._parent = null
    this._children = []

    this._style = null
    this._env = null
    this._environmental = false

    this._anchor = null
    this._anchorFrame = null
    this._anchorWatched = []
    this._anchorScrolled = null
    this._anchorSize = null
    this._anchorHidden = false

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

    // Flattened here because the kept style must be resolved: a dropped property
    // is found by comparing it with the previous one.
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

    if (this._anchorSize !== null) this._anchorResize()

    this._paint(this._compose(paint))

    if (this._anchorHidden) this._paint(this._anchorShown(false))

    this._relayout()
  }

  get anchor() {
    return this._anchor
  }

  // The box has no size until layout, so it is placed in the layout pass.
  set anchor(value) {
    this._anchor = anchor.options(value, (to) => to instanceof NativeNode)
    this._anchorFrame = null

    if (this._anchor === null || this._anchor.match === null) this._anchorMatch(null)

    if (this._anchor === null) {
      this._anchorWatch([])
      this._anchorHide(false)
    }

    this._relayout()
  }

  get env() {
    let node = this

    while (node._parent !== null) node = node._parent

    // Merged with the defaults, as a platform only reports what it knows and an
    // unreported variable is zero.
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

    if (this._config !== null) child._configure(this._config)

    // On a platform that paints in list order an appended child is on top
    // regardless of depth, so reorder whenever any child has one.
    if (child._zIndex !== 0) this._layered = true

    if (this._layered) this._ordered()

    // A subtree built before it was attached resolved against no environment.
    if (this.env !== style.ENV) child._resolve()

    this._relayout()

    revision++
  }

  // The index is read after detaching, as detaching shifts later indices.
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

    this._relayout()

    revision++
  }

  destroy() {
    // Yoga refuses to operate on a node it has already freed.
    if (this.destroyed) return

    while (this._children.length > 0) {
      const child = this._children[0]

      child.destroy()

      // Removed here even if destroying did not, as a list that never shrinks
      // would loop forever.
      const index = this._children.indexOf(child)

      if (index !== -1) this._children.splice(index, 1)
    }

    if (this._parent !== null) this._parent.removeChild(this)

    this._anchorWatch([])

    this._destroy()
    this._layout.destroy()
  }

  get destroyed() {
    return this._layout.tag === 0
  }

  // The position in the window comes from the toolkit, which applies scroll
  // offsets and transforms. Unlike React Native, the result is returned rather
  // than passed to a callback, as nothing here is asynchronous.
  measure() {
    const { x, y, width, height } = this._frame()
    const located = this._located()

    return { x, y, width, height, pageX: located.x, pageY: located.y }
  }

  measureInWindow() {
    const { width, height } = this._frame()
    const { x, y } = this._located()

    return { x, y, width, height }
  }

  measureLayout(node) {
    const { width, height } = this._frame()

    const here = this._located()
    const there = node._located()

    return { x: here.x - there.x, y: here.y - there.y, width, height }
  }

  measureEdges() {
    return {
      margin: edges(this._layout, 'layoutMargin'),
      border: edges(this._layout, 'layoutBorder'),
      padding: edges(this._layout, 'layoutPadding')
    }
  }

  _frame() {
    if (this._anchorFrame !== null) return this._anchorFrame

    const { left, top, width, height } = this._layout.layout

    return { x: left, y: top, width, height }
  }

  _located() {
    if (this.destroyed) return { x: 0, y: 0 }

    let root = this

    while (root._parent !== null) root = root._parent

    if (root === this) return { x: 0, y: 0 }

    return measure.locate(this, root)
  }

  // A commit can outlive the nodes it was scheduled for, so laying out a
  // destroyed tree is a no-op.
  layout(width, height, config = this._config) {
    if (this.destroyed) return

    this._laid = { width, height }
    this._pending = false

    if (config !== null) this._configure(config)

    this._layout.calculateLayout(width, height)

    this.flush()
  }

  // Coalesces every request in a turn into one pass of the root.
  _relayout() {
    let root = this

    while (root._parent !== null) root = root._parent

    if (root._laid === null || root._pending) return

    root._pending = true

    queueMicrotask(() => {
      if (root._pending && !root.destroyed) root.layout(root._laid.width, root._laid.height)
    })
  }

  // Only for measured nodes, as Yoga refuses to dirty any other.
  _remeasure() {
    this._layout.markDirty()
    this._relayout()
  }

  // Yoga rounds each node to the pixel grid of its own config, so a tree shares
  // the config of its window.
  _configure(config) {
    if (this._config === config) return

    this._config = config
    this._layout.setConfig(config)

    for (const child of this._children) child._configure(config)
  }

  flush() {
    if (this._revision !== revision) this._collect()

    const nodes = this._nodes
    const frames = this._frames

    LayoutNode.readLayouts(this._tags, frames, nodes.length)

    let pending = null
    let deferred = null

    for (let i = 0; i < nodes.length; i++) {
      const offset = i * 5
      const node = nodes[i]

      // An anchor target may come later in the walk.
      if (anchored(node)) {
        if (deferred === null) deferred = []

        deferred.push(node, i)

        continue
      }

      // AppKit clears a layer-backed view's transform whenever it sets the frame,
      // including in its own display pass, so the transform is reapplied on every
      // pass. A box that just stopped being anchored is rewritten to its layout
      // frame.
      if (frames[offset] === 0 && node._anchorFrame === null) {
        if (node._transform !== null) node._paint(node._transformed())

        continue
      }

      node._anchorFrame = null

      pending = write(
        node,
        frames[offset + 1],
        frames[offset + 2],
        frames[offset + 3],
        frames[offset + 4],
        pending
      )
    }

    if (deferred !== null) {
      for (let i = 0; i < deferred.length; i += 2) {
        const offset = deferred[i + 1] * 5

        pending = deferred[i]._anchorPlace(
          frames[offset + 1],
          frames[offset + 2],
          frames[offset + 3],
          frames[offset + 4],
          pending
        )
      }
    }

    deliver(pending)
  }

  // A scroll view moves the target without a layout pass, so the node also
  // listens for scrolling.
  _anchorPlace(x, y, width, height, pending) {
    const target = this._anchorTarget()
    const parent = this._parent

    this._anchorFrame =
      target === null
        ? null
        : anchor.place(
            this._anchor,
            target.rectangle,
            width,
            height,
            padded(parent),
            anchored(parent) ? parent._anchorFrame : null
          )

    this._anchorWatch(target === null ? [] : target.scrolled)
    this._anchorMatch(target === null ? null : anchor.matched(this._anchor.match, target.rectangle))
    this._anchorHide(target !== null && !target.shown)

    const frame = this._anchorFrame === null ? { x, y, width, height } : this._anchorFrame

    return write(this, frame.x, frame.y, frame.width, frame.height, pending)
  }

  _anchorTarget() {
    let to = this._anchor.to

    if (typeof to === 'function') to = to()

    if (to === null || to === undefined) return null

    if (!(to instanceof NativeNode)) {
      return { rectangle: anchor.rectangle(to), scrolled: [], shown: true }
    }

    if (to.destroyed) return null

    const here = origin(this._parent)
    const there = origin(to)

    if (here.root !== there.root) return null

    const { width, height } = to._frame()

    // A scroll view above both moves them together, so only the others matter.
    const scrolled = [
      ...here.scrolled.filter((view) => !there.scrolled.includes(view)),
      ...there.scrolled.filter((view) => !here.scrolled.includes(view))
    ]

    return {
      rectangle: { x: there.x - here.x, y: there.y - here.y, width, height },
      scrolled,
      shown: there.shown
    }
  }

  _anchorWatch(scrolled) {
    if (this._anchorScrolled === null) this._anchorScrolled = () => this._anchorScroll()

    for (const view of this._anchorWatched) {
      if (!scrolled.includes(view)) view.off('scroll', this._anchorScrolled)
    }

    for (const view of scrolled) {
      if (!this._anchorWatched.includes(view)) view.on('scroll', this._anchorScrolled)
    }

    this._anchorWatched = scrolled
  }

  // This pass has already sized the node, so the new size applies on the next.
  _anchorMatch(size) {
    if (sameSize(size, this._anchorSize)) return

    this._anchorSize = size

    this._anchorResize()
    this._relayout()
  }

  _anchorResize() {
    const { width, height } = this._style || {}
    const size = this._anchorSize || {}

    style.apply(
      this._layout,
      { width: size.width ?? width, height: size.height ?? height },
      {},
      style.PAINT,
      this.env
    )
  }

  // As CSS's `anchors-visible`: a clipped target leaves nothing to point at.
  _anchorHide(hidden) {
    if (hidden === this._anchorHidden) return

    this._anchorHidden = hidden

    this._paint(this._anchorShown(!hidden))
  }

  _anchorShown(shown) {
    const { opacity = 1, pointerEvents = 'auto' } = shown ? this._style || {} : HIDDEN

    const paint = { opacity }

    if (this._paintable.has('pointerEvents')) paint.pointerEvents = pointerEvents

    return paint
  }

  _anchorScroll() {
    if (this.destroyed || !anchored(this)) return

    const nodes = []

    flatten(this, nodes)

    let pending = null

    for (const node of nodes) {
      if (!anchored(node)) continue

      const { left, top, width, height } = node._layout.layout

      pending = node._anchorPlace(left, top, width, height, pending)
    }

    deliver(pending)
  }

  // Overridden by scroll views.
  _scrolled() {
    return null
  }

  // A painted length can refer to the environment too, so this repaints rather
  // than only laying out again.
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

  // A transform resolves against the box, which the style layer does not know,
  // so the matrix is composed here and again whenever the box changes.
  _compose(paint) {
    // On a platform without depth of its own, the parent orders its children.
    if ('zIndex' in paint && paint.zIndex !== this._zIndex) {
      this._zIndex = paint.zIndex

      const parent = this._parent

      if (parent !== null) {
        if (paint.zIndex !== 0) parent._layered = true

        if (parent._layered) parent._ordered()
      }
    }

    if ('transform' in paint || 'transformOrigin' in paint) {
      // Validated now, as they are only resolved once there is a box.
      if ('transform' in paint) {
        this._transform = transform.compose(paint.transform) === null ? null : paint.transform
      }

      if ('transformOrigin' in paint) {
        transform.origin(paint.transformOrigin, 0, 0)
        this._origin = paint.transformOrigin
      }

      Object.assign(paint, this._transformed())
    }

    return paint
  }

  // A toolkit with a pivot uses the origin directly, and others fold it into
  // the matrix.
  _transformed() {
    if (this._transform === null) return { transform: null, transformOrigin: null }

    return {
      transform: transform.compose(this._transform, this._width, this._height),
      transformOrigin: transform.origin(this._origin, this._width, this._height)
    }
  }

  // Platform hooks.

  get _paintable() {
    return style.PAINT
  }

  get _container() {
    return true
  }

  // Called before the child joins the list, so the list holds only its future
  // siblings.
  _insert(child, index) {
    throw new Error(`${this.constructor.name} does not implement _insert`)
  }

  _remove(child) {
    throw new Error(`${this.constructor.name} does not implement _remove`)
  }

  // For a platform that paints children in list order.
  _ordered() {}

  // Nodes are placed by their parent because only AppKit and UIKit keep a
  // frame on the view. GTK, WinUI and Android position children through the
  // parent.
  _place(child, x, y, width, height) {
    throw new Error(`${this.constructor.name} does not implement _place`)
  }

  // The Apple platforms derive a view's frame from its bounds and transform,
  // so the transform is removed before the box is written.
  _untransform() {}

  // Unlike `_place`, also called for a root.
  _resized(width, height) {}

  _paint(properties) {
    throw new Error(`${this.constructor.name} does not implement _paint`)
  }

  _destroy() {}
}

// The list length once `child` is detached, for bounds checks and appends.
function length(parent, child) {
  return parent._children.length - (child._parent === parent ? 1 : 0)
}

// `hasNewLayout` only means the layout was written, and a root is written on
// every pass, so frames are compared instead.
function moved(frame, x, y, width, height) {
  return (
    frame === null ||
    frame.x !== x ||
    frame.y !== y ||
    frame.width !== width ||
    frame.height !== height
  )
}

function write(node, x, y, width, height, pending) {
  const parent = node._parent

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

  return pending
}

// Delivered after the pass, as a listener may remove nodes from the snapshot
// being walked.
function deliver(pending) {
  if (pending === null) return

  for (let i = 0; i < pending.length; i += 2) {
    const node = pending[i]

    if (!node.destroyed) node.emit('layout', pending[i + 1])
  }
}

function anchored(node) {
  return node._anchor !== null && node._parent !== null
}

// Uses Yoga's frames, as a toolkit with its own layout pass may not have
// placed anything yet. Transforms are ignored.
function origin(node) {
  const scrolled = []

  let x = 0
  let y = 0

  // The part of the node left by clipping ancestors, in its own coordinates.
  let { width: right, height: bottom } = node._frame()
  let left = 0
  let top = 0

  while (node._parent !== null) {
    const frame = node._frame()

    x += frame.x
    y += frame.y

    node = node._parent

    const offset = node._scrolled()

    if (offset !== null) {
      x -= offset.x
      y -= offset.y

      scrolled.push(node)
    }

    if (clips(node)) {
      const { width, height } = node._frame()

      left = Math.max(left, -x)
      top = Math.max(top, -y)
      right = Math.min(right, width - x)
      bottom = Math.min(bottom, height - y)
    }
  }

  return { x, y, scrolled, root: node, shown: left <= right && top <= bottom }
}

// A root clips to its window and a scroll view to its box.
function clips(node) {
  if (node._parent === null || node._scrolled() !== null) return true

  const overflow = node._style === null ? undefined : node._style.overflow

  return overflow !== undefined && overflow !== 'visible'
}

function sameSize(a, b) {
  if (a === null || b === null) return a === b

  return a.width === b.width && a.height === b.height
}

// As CSS keeps an absolutely positioned box inside its containing block.
function padded(node) {
  const { border } = node.measureEdges()
  const { width, height } = node._frame()

  return {
    x: border.left,
    y: border.top,
    width: width - border.left - border.right,
    height: height - border.top - border.bottom
  }
}

function flatten(node, out) {
  out.push(node)

  for (const child of node._children) flatten(child, out)
}

function edges(layout, read) {
  const { TOP, RIGHT, BOTTOM, LEFT } = constants.EDGE

  return {
    top: layout[read](TOP),
    right: layout[read](RIGHT),
    bottom: layout[read](BOTTOM),
    left: layout[read](LEFT)
  }
}
