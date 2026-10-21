import EventEmitter from 'bare-events'
import NativeStyleSheet = require('./style-sheet')

/**
 * The base of every node: a box laid out by Yoga and drawn by a view of the platform. `C` is what
 * the node can contain: any node for a container, `never` for a leaf, and text fragments for a
 * text node.
 */
interface NativeNode<
  M extends Record<keyof M, unknown[]> = NativeNode.Events,
  C = NativeNode.Any
> extends EventEmitter<M> {
  /** The view of the platform toolkit that draws the node. */
  readonly native: unknown

  readonly parent: NativeNode.Any | null

  /** A copy of the children of the node. */
  readonly children: C[]

  /**
   * The style last set, flattened. Setting it replaces the whole style, resetting omitted
   * properties. Throws on a property the node does not accept.
   */
  get style(): NativeStyleSheet.Style | null
  set style(value: NativeStyleSheet.StyleProp)

  /** The environment of the root, which `env()` values in a style follow. */
  get env(): NativeNode.Env
  set env(value: Partial<NativeNode.Env> | null | undefined)

  /**
   * Place the node beside another node or a rectangle, as for a tooltip or a popover, or `null` to
   * lay it out as usual. The node should be absolutely positioned. It flips to the other side if
   * it does not fit, and covers the target, inset by `offset`, if it fits on neither. It is kept
   * inside the border of its parent, follows scroll views but not transforms, and is hidden while
   * the target is clipped out of view.
   *
   * A node anchored inside another anchored node follows that one: it flips if the other flipped,
   * may stand out of it, and gets no size if the other covers its target. This is how an arrow on
   * the edge of a tooltip is made.
   */
  get anchor(): NativeNode.Anchor | null
  set anchor(value: NativeNode.AnchorOptions | null)

  readonly destroyed: boolean

  /** Throws if the node cannot contain children. */
  appendChild(child: C): void

  /** Throws if the node cannot contain children or `index` is out of range. */
  insertChild(child: C, index: number): void

  /** Insert `child` before `reference`, or at the end if `reference` is `null`. */
  insertBefore(child: C, reference: C | null): void

  /** Detach `child` without destroying it. */
  removeChild(child: C): void

  /** Destroy the node and all of its descendants, and detach it from its parent. */
  destroy(): void

  /** The frame of the node within its parent, and its position within the root. */
  measure(): NativeNode.Measurement

  /** The frame of the node relative to the root. */
  measureInWindow(): NativeNode.Frame

  /** The frame of the node relative to `node`. */
  measureLayout(node: NativeNode.Any): NativeNode.Frame

  /** The margin, border and padding of the node, as resolved by its last layout. */
  measureEdges(): NativeNode.Edges

  /** Lay out the tree with the node as its root at the given size, then flush it. */
  layout(width: number, height: number): void

  /** Write the last layout to the views of the platform and emit `layout` events. */
  flush(): void
}

declare class NativeNode<
  M extends Record<keyof M, unknown[]> = NativeNode.Events,
  C = NativeNode.Any
> {
  constructor()
}

declare namespace NativeNode {
  /** A node of any kind. */
  export type Any = NativeNode<any, any>

  export interface Events {
    /** The frame of the node changed in a layout pass. */
    layout: [frame: Frame]
  }

  export interface Point {
    x: number
    y: number
  }

  export interface Size {
    width: number
    height: number
  }

  /** In points, or dp on Android. */
  export interface Frame extends Point, Size {}

  /** In points, or dp on Android. */
  export interface Insets {
    top: number
    right: number
    bottom: number
    left: number
  }

  export interface Edges {
    margin: Insets
    border: Insets
    padding: Insets
  }

  export interface Measurement extends Frame {
    /** The position of the node within the root, including scrolling and transforms. */
    pageX: number
    pageY: number
  }

  export type Side = 'top' | 'right' | 'bottom' | 'left'

  /** A node, a rectangle relative to the parent, or nothing to leave the node where it is. */
  export type AnchorTarget = Any | Frame | null | undefined

  export interface AnchorOptions {
    /** What to place the node beside, or a function that returns it each time the node is placed. */
    to: AnchorTarget | (() => AnchorTarget)
    /** The side to place the node on if it fits there. Defaults to `bottom`. */
    side?: Side
    /** Where the node lines up along the side. Defaults to `center`. */
    align?: 'start' | 'center' | 'end'
    /** The distance between the node and what it is placed beside. Defaults to `0`. */
    offset?: number
    /**
     * Size the node to the width, the height or both of what it is placed beside, instead of to
     * its style. Defaults to `null`.
     */
    match?: 'width' | 'height' | 'both' | null
  }

  export type Anchor = Required<AnchorOptions>

  /** What the platform covers of the window. Every variable defaults to `0`. */
  export interface Env {
    'safe-area-inset-top': number
    'safe-area-inset-right': number
    'safe-area-inset-bottom': number
    'safe-area-inset-left': number
    'keyboard-inset-height': number
  }
}

export = NativeNode
