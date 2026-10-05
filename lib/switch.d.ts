import NativeControlNode = require('./control-node')
import NativeNode = require('./node')
import NativeStyleSheet = require('./style-sheet')

/** An on and off toggle at the natural size of the platform. */
interface NativeSwitch extends NativeControlNode<NativeSwitch.Events> {
  /** Writing it from code never emits `change`. */
  value: boolean

  /** Defaults to `true`. */
  enabled: boolean

  get style(): NativeStyleSheet.ControlStyle | null
  set style(value: NativeStyleSheet.StyleProp<NativeStyleSheet.ControlStyle>)
}

declare class NativeSwitch {
  constructor()
}

declare namespace NativeSwitch {
  export interface Events extends NativeNode.Events {
    /** The switch was toggled by the user. */
    change: [value: boolean]
  }
}

export = NativeSwitch
