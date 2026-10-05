import EventEmitter from 'bare-events'

/** The color scheme of the window that last had content. */
interface NativeAppearance extends EventEmitter<NativeAppearance.Events> {
  getColorScheme(): NativeAppearance.ColorScheme

  /** Force a color scheme, or follow the system again with `null`. */
  setColorScheme(colorScheme?: NativeAppearance.ColorScheme | null): void
}

declare const NativeAppearance: NativeAppearance

declare namespace NativeAppearance {
  export type ColorScheme = 'light' | 'dark'

  export interface Events {
    change: [colorScheme: ColorScheme]
  }
}

export = NativeAppearance
