/** Modal dialogs over the window that last had content. */
interface NativeAlert {
  /**
   * Show a dialog and resolve with the chosen button's index after calling its `onPress`. The last
   * of at most three buttons is the default. Defaults to a single `OK` button.
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
