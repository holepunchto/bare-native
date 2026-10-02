const NativeNode = require('./node')

// What a text input and a switch have in common: a leaf the toolkit draws, and
// one the person using it can reach with a keyboard, which is what makes an
// indication of where the focus is something neither can do without.
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

  // Whether the toolkit draws its own indication that this control has the
  // focus. Every platform that has one draws it by default, because a control
  // nobody can see the focus of is one nobody can use without a mouse; an
  // application that draws its own out of `focus` and `blur` turns it off.
  set focusRing(value) {
    const ring = value !== false

    if (this._focusRing === ring) return

    this._focusRing = ring

    this._ringed(ring)
  }

  _ringed(ring) {}
}
