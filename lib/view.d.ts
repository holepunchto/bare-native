import NativeNode = require('./node')
import NativeStyleSheet = require('./style-sheet')

/** A box that contains other nodes and receives pointer events. */
interface NativeView<
  M extends Record<keyof M, unknown[]> = NativeView.Events
> extends NativeNode<M> {
  get style(): NativeStyleSheet.ViewStyle | null
  set style(value: NativeStyleSheet.StyleProp<NativeStyleSheet.ViewStyle>)
}

declare class NativeView<M extends Record<keyof M, unknown[]> = NativeView.Events> {
  constructor()
}

declare namespace NativeView {
  export interface PointerEvent {
    /** Relative to the view. */
    x: number
    y: number
    button: number
    pointerId: number
    pointerType: 'mouse' | 'touch' | 'pen'
  }

  export interface Events extends NativeNode.Events {
    pointerdown: [event: PointerEvent]
    pointermove: [event: PointerEvent]
    pointerup: [event: PointerEvent]
    /** The platform took the pointer away, such as for a scroll. */
    pointercancel: [event: PointerEvent]
  }
}

export = NativeView
