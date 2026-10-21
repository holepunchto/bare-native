const AppKitAppearance = require('bare-app-kit/appearance')
const AppKitApplication = require('bare-app-kit/application')

const AQUA = 'NSAppearanceNameAqua'
const DARK_AQUA = 'NSAppearanceNameDarkAqua'

const NAMES = { light: AQUA, dark: DARK_AQUA }

// Collapses high contrast and vibrant appearances into light or dark.
function scheme(appearance) {
  return appearance.bestMatchFromAppearancesWithNames([AQUA, DARK_AQUA]) === DARK_AQUA
    ? 'dark'
    : 'light'
}

exports.read = function read(window) {
  return scheme(AppKitApplication.effectiveAppearance)
}

exports.write = function write(window, colorScheme) {
  AppKitApplication.appearance =
    colorScheme === null ? null : AppKitAppearance.named(NAMES[colorScheme])
}

exports.watch = function watch(window, onchange) {
  window.contentView._native.on('didChangeEffectiveAppearance', () =>
    onchange(exports.read(window))
  )
}
