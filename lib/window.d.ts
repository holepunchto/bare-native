import EventEmitter from 'bare-events'
import NativeNode = require('./node')

/** A window of the platform, whose content is a tree of nodes. */
interface NativeWindow extends EventEmitter<NativeWindow.Events> {
  /** The window of the platform toolkit. */
  readonly native: unknown

  /** The root passed to `content()`, or `null` before that. */
  readonly contentView: NativeNode.Any | null

  /** How much of the window the software keyboard covers, or `0` without one. */
  readonly keyboard: number

  /** The size of the content area, or zero before `content()`. */
  readonly size: NativeNode.Size

  /** How many pixels a point is on the display the window is on, which layout is rounded to. */
  readonly scale: number

  show(): this

  /** Make `view` the root of the window and lay it out at the size of the window. */
  content(view: NativeNode.Any): this

  /**
   * Lay out the content at the size of the window now. A tree is laid out again by itself after
   * every change to it, so this is rarely needed.
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
