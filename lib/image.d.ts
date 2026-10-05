import NativeNode = require('./node')
import NativeStyleSheet = require('./style-sheet')

/** An image read from a file. */
interface NativeImage extends NativeNode<NativeImage.Events, never> {
  /** The path of the image file. */
  get source(): string | null
  set source(value: string | null | undefined)

  /** The natural size of the image, or `null` until it has been decoded. */
  readonly intrinsicSize: NativeNode.Size | null

  get style(): NativeStyleSheet.ImageStyle | null
  set style(value: NativeStyleSheet.StyleProp<NativeStyleSheet.ImageStyle>)
}

declare class NativeImage {
  constructor()
}

declare namespace NativeImage {
  export interface Events extends NativeNode.Events {
    /** The image was decoded, with its natural size. */
    load: [size: NativeNode.Size]
    /** The image could not be decoded. Only emitted if something is listening. */
    error: [err: Error]
  }
}

export = NativeImage
