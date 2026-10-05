import NativeNode = require('./node')
import NativeStyleSheet = require('./style-sheet')

/** A web page. A web view cannot contain children. */
interface NativeWebView extends NativeNode<NativeNode.Events, never> {
  loadURL(url: string): this

  loadHTML(html: string): this

  /** Allow the page to be inspected by the development tools of the platform. */
  inspectable(enabled: boolean): this

  get style(): NativeStyleSheet.ViewStyle | null
  set style(value: NativeStyleSheet.StyleProp<NativeStyleSheet.ViewStyle>)
}

declare class NativeWebView {
  constructor()
}

export = NativeWebView
