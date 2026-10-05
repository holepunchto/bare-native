/** Modal dialogs over the window that last had content. */
interface NativeAlert {
  /**
   * Show a dialog and resolve with the index of the button that was chosen, after calling its
   * `onPress`. The last button is the default. Defaults to a single `OK` button, and takes at most
   * three.
   */
  alert(title: string, message?: string | null, buttons?: NativeAlert.Button[]): Promise<number>
}

declare const NativeAlert: NativeAlert

declare namespace NativeAlert {
  export interface Button {
    text: string
    /** Defaults to `default`. */
    style?: 'default' | 'cancel' | 'destructive'
    onPress?: (() => void) | null
  }
}

export = NativeAlert
