import EventEmitter from 'bare-events'

/** The size of the window that last had content, and of its screen. */
interface NativeDimensions extends EventEmitter<NativeDimensions.Events> {
  get(dimension: 'window' | 'screen'): NativeDimensions.ScaledSize
}

declare const NativeDimensions: NativeDimensions

declare namespace NativeDimensions {
  export interface ScaledSize {
    /** In points, or dp on Android. */
    width: number
    height: number
    /** Physical pixels per point. */
    scale: number
    /** The text scaling chosen by the user, `1` when unscaled. */
    fontScale: number
  }

  export interface Events {
    change: [dimensions: { window: ScaledSize; screen: ScaledSize }]
  }
}

export = NativeDimensions
