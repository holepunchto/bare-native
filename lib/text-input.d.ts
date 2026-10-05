import NativeControlNode = require('./control-node')
import NativeNode = require('./node')
import NativeStyleSheet = require('./style-sheet')

/**
 * A field of editable text. Writing to it from code never emits `change`, `keypress` or
 * `selectionchange`.
 */
interface NativeTextInput extends NativeControlNode<NativeTextInput.Events> {
  readonly multiline: boolean
  readonly secureTextEntry: boolean

  get value(): string
  set value(value: string | null | undefined)

  /** Not shown by a multiline input on macOS, iOS and Linux. */
  get placeholder(): string
  set placeholder(value: string | null | undefined)

  /** Defaults to `true`. */
  editable: boolean

  /** Setting `null` forgets the selection without moving the caret. */
  get selection(): NativeTextInput.Selection
  set selection(value: { start?: number; end?: number } | null | undefined)

  get keyboardType(): NativeTextInput.KeyboardType
  set keyboardType(value: NativeTextInput.KeyboardType | null | undefined)

  get returnKeyType(): NativeTextInput.ReturnKeyType
  set returnKeyType(value: NativeTextInput.ReturnKeyType | null | undefined)

  get autoCapitalize(): NativeTextInput.AutoCapitalize
  set autoCapitalize(value: NativeTextInput.AutoCapitalize | null | undefined)

  /** Defaults to `true`. */
  autoCorrect: boolean

  get style(): NativeStyleSheet.TextInputStyle | null
  set style(value: NativeStyleSheet.StyleProp<NativeStyleSheet.TextInputStyle>)

  focus(): this

  blur(): this
}

declare class NativeTextInput {
  /** The shape of an input is settled when it is made. Throws if it is both multiline and secure. */
  constructor(opts?: { multiline?: boolean; secureTextEntry?: boolean })
}

declare namespace NativeTextInput {
  export type KeyboardType =
    'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad' | 'url'

  export type ReturnKeyType = 'default' | 'done' | 'go' | 'next' | 'search' | 'send'

  export type AutoCapitalize = 'none' | 'sentences' | 'words' | 'characters'

  /** Offsets into the text. */
  export interface Selection {
    start: number
    end: number
  }

  export interface KeyPressEvent {
    /** The text that replaces the range from `start` to `end`, empty for a deletion. */
    text: string
    start: number
    end: number
  }

  export interface Events extends NativeNode.Events {
    change: [value: string]
    selectionchange: [selection: Selection]
    keypress: [event: KeyPressEvent]
    focus: []
    blur: []
    /** Return was pressed in a single line input. */
    submit: [value: string]
  }
}

export = NativeTextInput
