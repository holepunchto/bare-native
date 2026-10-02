// What a text input asks of the keyboard it is typed on. Four keyword sets,
// named as React Native names them, resolved here so that no platform file has
// to know which spellings are legal. A toolkit with no software keyboard has
// nothing to do with the first two, which is not a gap: there is no keyboard
// to configure.

const KEYBOARD = new Set([
  'default',
  'number-pad',
  'decimal-pad',
  'numeric',
  'email-address',
  'phone-pad',
  'url'
])

const RETURN_KEY = new Set(['default', 'done', 'go', 'next', 'search', 'send'])

const CAPITALIZE = new Set(['none', 'sentences', 'words', 'characters'])

function keyword(set, name, value, fallback) {
  if (value === undefined || value === null) return fallback

  if (!set.has(value)) {
    throw new TypeError(`Unknown value '${value}' for '${name}'`)
  }

  return value
}

exports.keyboardType = (value) => keyword(KEYBOARD, 'keyboardType', value, 'default')

exports.returnKeyType = (value) => keyword(RETURN_KEY, 'returnKeyType', value, 'default')

exports.autoCapitalize = (value) => keyword(CAPITALIZE, 'autoCapitalize', value, 'sentences')

exports.autoCorrect = (value) => value !== false
