const NativeNode = require('./node')

module.exports = exports = class NativeControlNode extends NativeNode {
  constructor() {
    super()

    this._focusRing = true
  }

  get _container() {
    return false
  }

  get focusRing() {
    return this._focusRing
  }

  set focusRing(value) {
    const ring = value !== false

    if (this._focusRing === ring) return

    this._focusRing = ring

    this._ringed(ring)
  }

  _ringed(ring) {}
}
