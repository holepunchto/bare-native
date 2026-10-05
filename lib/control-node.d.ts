import NativeNode = require('./node')

/** The base of the interactive leaves. A control cannot contain children. */
interface NativeControlNode<
  M extends Record<keyof M, unknown[]> = NativeNode.Events
> extends NativeNode<M, never> {
  /** Whether the platform draws its own focus indicator. Defaults to `true`. */
  focusRing: boolean
}

declare class NativeControlNode<M extends Record<keyof M, unknown[]> = NativeNode.Events> {
  constructor()
}

export = NativeControlNode
