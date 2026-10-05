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
   * The style last set, flattened. Setting it replaces the whole style, so a property that is left
   * out goes back to its default. Throws on a property the node does not accept.
   */
  get style(): NativeStyleSheet.Style | null
  set style(value: NativeStyleSheet.StyleProp)

  /** The environment of the root, which `env()` values in a style follow. */
  get env(): NativeNode.Env
  set env(value: Partial<NativeNode.Env> | null | undefined)

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

  export interface Measurement extends Frame {
    /** The position of the node within the root, including scrolling and transforms. */
    pageX: number
    pageY: number
  }

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
