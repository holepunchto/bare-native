import NativeNode = require('./node')
import NativeStyleSheet = require('./style-sheet')
import NativeTextFragment = require('./text-fragment')

/** A paragraph of text, measured by the platform. It contains text fragments rather than nodes. */
interface NativeText extends NativeNode<NativeNode.Events, NativeTextFragment> {
  /** The text of the paragraph itself, without that of its fragments. */
  text: string

  /** The most lines to draw, or `0` for no limit. */
  get numberOfLines(): number
  set numberOfLines(value: number | null | undefined)

  /** How text past `numberOfLines` is cut. Defaults to `tail`. */
  get ellipsizeMode(): 'tail' | 'clip'
  set ellipsizeMode(value: 'tail' | 'clip' | null | undefined)

  get style(): NativeStyleSheet.TextStyle | null
  set style(value: NativeStyleSheet.StyleProp<NativeStyleSheet.TextStyle>)
}

declare class NativeText {
  constructor(text?: string)
}

export = NativeText
