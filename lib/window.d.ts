import EventEmitter from 'bare-events'
import NativeNode = require('./node')

/** A platform window whose content is a tree of nodes. */
interface NativeWindow extends EventEmitter<NativeWindow.Events> {
  /** The platform toolkit window. */
  readonly native: unknown

  /** The root passed to `content()`, or `null` before that. */
  readonly contentView: NativeNode.Any | null

  /** How much of the window the software keyboard covers, or `0` without one. */
  readonly keyboard: number

  /** The size of the content area, or zero before `content()`. */
  readonly size: NativeNode.Size

  /** Pixels per point on the window's display, which layout is rounded to. */
  readonly scale: number

  show(): this

  /** Make `view` the root and lay it out at the window size. */
  content(view: NativeNode.Any): this

  /**
   * Lay out the content now. A tree is laid out again after every change, so this is rarely
   * needed.
   */
  layout(): void
}

declare class NativeWindow {
  /** On iOS and Android the window fills the screen and the size is ignored. */
  constructor(width: number, height: number)
}

declare namespace NativeWindow {
  export interface Events {
    /** The window was resized, after the content was laid out again. */
    resize: []
  }
}

export = NativeWindow
