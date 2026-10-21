const style = require('./style')

// Frozen styles are passed by reference, so an unchanged style is
// recognised by identity. Validating here also reports a misspelling where
// it was written rather than on first render.
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

  static flatten(value) {
    return style.flatten(value)
  }
}
