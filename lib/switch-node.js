const NativeNode = require('./node')
const style = require('./style')

// A switch is a leaf of a size the toolkit decides, holding one of two states.
// What a platform reports when someone toggles it is the platform's; what is
// shared is that a caller's own write is not a toggle, which is the fence a
// text input needs for the same reason. Three of the five tell their watchers
// about a write whoever made it, and reporting one back to a controlled switch
// is a loop.
module.exports = exports = class NativeSwitchNode extends NativeNode {
  constructor() {
    super()

    this._enabled = true
    this._writing = false

    this._layout.measure = this._onmeasure.bind(this)
  }

  get _container() {
    return false
  }

  get _paintable() {
    return style.CONTROL
  }

  get value() {
    return this._read()
  }

  set value(value) {
    const next = value === true

    if (this._read() === next) return

    this._fenced(() => this._write(next))
  }

  get enabled() {
    return this._enabled
  }

  set enabled(value) {
    const enabled = value !== false

    if (this._enabled === enabled) return

    this._enabled = enabled

    this._enabling(enabled)
  }

  // A switch is drawn at the one size its toolkit draws it at, so nothing a
  // caller holds changes it and it is measured once.
  _onmeasure(width, widthMode, height, heightMode) {
    return this._natural()
  }

  // Anything that moves the switch on a caller's behalf goes through here, so
  // that what the toolkit reports on the way back is not mistaken for someone
  // working it.
  _fenced(write) {
    this._writing = true

    try {
      write()
    } finally {
      this._writing = false
    }
  }

  _remeasure() {
    this._layout.markDirty()
  }

  _toggled() {
    if (this._writing) return

    this.emit('change', this._read())
  }

  _read() {
    throw new Error(`${this.constructor.name} does not implement _read`)
  }

  _write(value) {
    throw new Error(`${this.constructor.name} does not implement _write`)
  }

  _natural() {
    throw new Error(`${this.constructor.name} does not implement _natural`)
  }

  _enabling(enabled) {}
}
