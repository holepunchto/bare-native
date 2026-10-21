const NativeControlNode = require('./control-node')
const style = require('./style')

module.exports = exports = class NativeSwitchNode extends NativeControlNode {
  constructor() {
    super()

    this._enabled = true
    this._writing = false

    this._layout.measure = this._onmeasure.bind(this)
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

  // A switch has a fixed size, so the constraints are ignored.
  _onmeasure(width, widthMode, height, heightMode) {
    return this._natural()
  }

  // Some platforms report programmatic writes as toggles, so caller writes are
  // fenced to keep a controlled switch from looping.
  _fenced(write) {
    this._writing = true

    try {
      write()
    } finally {
      this._writing = false
    }
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
