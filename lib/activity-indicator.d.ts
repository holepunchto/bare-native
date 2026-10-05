import NativeNode = require('./node')
import NativeStyleSheet = require('./style-sheet')

/** A spinner showing that something is in progress. */
interface NativeActivityIndicator extends NativeNode<NativeNode.Events, never> {
  /** Defaults to `true`. */
  animating: boolean

  /** Defaults to `small`. */
  get size(): 'small' | 'large'
  set size(value: 'small' | 'large' | null | undefined)

  get style(): NativeStyleSheet.ActivityIndicatorStyle | null
  set style(value: NativeStyleSheet.StyleProp<NativeStyleSheet.ActivityIndicatorStyle>)
}

declare class NativeActivityIndicator {
  constructor()
}

export = NativeActivityIndicator
