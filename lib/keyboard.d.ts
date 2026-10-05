import EventEmitter from 'bare-events'

/** The software keyboard of the window that last had content. Inert where there is none. */
interface NativeKeyboard extends EventEmitter<NativeKeyboard.Events> {
  /** How much of the window the keyboard covers, or `0` when it is hidden. */
  readonly height: number

  isVisible(): boolean

  /** Hide the keyboard by ending the current edit. */
  dismiss(): void
}

declare const NativeKeyboard: NativeKeyboard

declare namespace NativeKeyboard {
  export interface Events {
    change: [event: { height: number }]
  }
}

export = NativeKeyboard
