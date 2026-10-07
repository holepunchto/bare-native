import NativeWindow = require('./window')

interface NativeOverlay {
  /** Whether a report is being shown. */
  readonly shown: boolean

  /** The window the overlay draws in, or `null` when it has none. */
  readonly window: NativeWindow | null

  /** Draw `report` in a window of its own, unless it is a transport failure. */
  show(report: NativeOverlay.Report): void

  /**
   * Take the window away. Unless `replaced` says the graph was just rebuilt, Android reloads the
   * graph, as the overlay took the place of the application's content.
   */
  hide(replaced: boolean): void
}

/**
 * Draw the failures of a `bare-refresh` host on the device, and take them away when a refresh or
 * reload succeeds. Pass it to `attach` when building a development build.
 */
declare function overlay(refresh: NativeOverlay.Host): NativeOverlay

declare namespace overlay {
  export { type NativeOverlay }
}

declare namespace NativeOverlay {
  /** The parts of a `bare-refresh` report that are drawn. */
  export interface Report {
    readonly phase: string
    readonly href: string | null
    readonly intact: boolean
    readonly name: string
    readonly message: string
    readonly stack: string | null
  }

  /** The parts of a `bare-refresh` host that the overlay uses. */
  export interface Host {
    readonly running: boolean
    reload(): Promise<unknown>
    on(name: 'error', fn: (err: unknown, report: Report) => void): this
    on(name: 'refresh' | 'reload', fn: () => void): this
  }
}

export = overlay
