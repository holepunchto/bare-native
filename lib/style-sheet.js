const style = require('./style')

// A style written once and handed out by reference, which is what lets an
// unchanged node be recognised by identity rather than by comparing what it
// holds. React rebuilds a style object on most renders even when nothing in it
// changed, so a style hoisted out of a render is the only one that can be
// skipped cheaply.
//
// It is also the one place a style is seen before anything is laid out with
// it, so a misspelling is reported where it was written rather than on the
// first render that reaches it.
module.exports = exports = class StyleSheet {
  static create(styles) {
    const created = {}

    for (const name in styles) {
      const declared = styles[name]

      for (const property in declared) {
        if (property in style.LAYOUT || style.KNOWN.has(property)) continue

        throw new TypeError(`Unknown style property '${property}' in '${name}'`)
      }

      created[name] = Object.freeze(declared)
    }

    return Object.freeze(created)
  }

  // What a list of styles comes to, which is what every primitive is given.
  // A caller needs it only to read one back.
  static flatten(value) {
    return style.flatten(value)
  }
}
