import NativeNode = require('./node')
import NativeStyleSheet = require('./style-sheet')
import NativeView = require('./view')

/** A viewport over its children, which are laid out at their natural size along its axis. */
interface NativeScrollView extends NativeNode<NativeScrollView.Events> {
  readonly horizontal: boolean

  /** The box that scrolls and contains the children. */
  readonly content: NativeView

  /** The style of the box that scrolls, rather than of the viewport. */
  get contentStyle(): NativeStyleSheet.ViewStyle | null
  set contentStyle(value: NativeStyleSheet.StyleProp<NativeStyleSheet.ViewStyle>)

  /** `flexShrink` and `flexDirection` are settled by the axis. */
  get style(): NativeStyleSheet.ViewStyle | null
  set style(value: NativeStyleSheet.StyleProp<NativeStyleSheet.ViewStyle>)

  /** Setting it scrolls, clamped to the content. */
  get contentOffset(): NativeNode.Point
  set contentOffset(value: Partial<NativeNode.Point>)
}

declare class NativeScrollView {
  /** The axis is settled when the view is made. */
  constructor(opts?: { horizontal?: boolean })
}

declare namespace NativeScrollView {
  export interface Events extends NativeNode.Events {
    scroll: [offset: NativeNode.Point]
  }
}

export = NativeScrollView
