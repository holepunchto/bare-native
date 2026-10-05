import NativeNode = require('./node')
import NativeStyleSheet = require('./style-sheet')

/** A web page. A web view cannot contain children. */
interface NativeWebView extends NativeNode<NativeNode.Events, never> {
  /** The URL last loaded, or `null` if the page was loaded from HTML. Setting it loads it. */
  get url(): string | null
  set url(value: string | null | undefined)

  /** The HTML last loaded, or `null` if the page was loaded from a URL. Setting it loads it. */
  get html(): string | null
  set html(value: string | null | undefined)

  /**
   * Whether the page can be inspected by the development tools of the platform. Defaults to
   * `false`. On Android it applies to every web view of the application.
   */
  get inspectable(): boolean
  set inspectable(value: boolean | null | undefined)

  get style(): NativeStyleSheet.ViewStyle | null
  set style(value: NativeStyleSheet.StyleProp<NativeStyleSheet.ViewStyle>)
}

declare class NativeWebView {
  constructor()
}

export = NativeWebView
