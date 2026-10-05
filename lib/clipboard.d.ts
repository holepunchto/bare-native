/** The text on the system clipboard. */
interface NativeClipboard {
  /** Resolves with an empty string if the clipboard holds no text. */
  getString(): Promise<string>

  setString(content: string): void

  hasString(): Promise<boolean>
}

declare const NativeClipboard: NativeClipboard

export = NativeClipboard
