import NativeStyleSheet = require('./style-sheet')

/** A run of text inside a `Text`, styled on its own. A fragment is not a node and has no box. */
interface NativeTextFragment {
  readonly parent: NativeTextFragment | null

  /** A copy of the children of the fragment. */
  readonly children: NativeTextFragment[]

  /** The text of the fragment itself, without that of its children. */
  text: string

  /** `null` inherits the style of the parent. */
  get style(): NativeStyleSheet.TextRunStyle | null
  set style(value: NativeStyleSheet.StyleProp<NativeStyleSheet.TextRunStyle>)

  /** Whether the fragment and its descendants are left out of the text. */
  hidden: boolean

  appendChild(child: NativeTextFragment): void

  /** Throws if `index` is out of range. */
  insertChild(child: NativeTextFragment, index: number): void

  /** Insert `child` before `reference`, or at the end if `reference` is `null`. */
  insertBefore(child: NativeTextFragment, reference: NativeTextFragment | null): void

  removeChild(child: NativeTextFragment): void

  destroy(): void
}

declare class NativeTextFragment {
  constructor(text?: string)

  /** Whether `value` is a fragment, including one from another copy of this module. */
  static isTextFragment(value: unknown): value is NativeTextFragment
}

export = NativeTextFragment
