const AppKitAppearance = require('bare-app-kit/appearance')
const AppKitApplication = require('bare-app-kit/application')

const AQUA = 'NSAppearanceNameAqua'
const DARK_AQUA = 'NSAppearanceNameDarkAqua'

const NAMES = { light: AQUA, dark: DARK_AQUA }

// An appearance is any of a dozen names, the high contrast and vibrant ones
// among them, and what crosses is only whether it is drawn light or dark.
// AppKit answers that itself: an appearance reports which of a set of names it
// is closest to.
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

// AppKit tells a view that what it is drawn in has changed, and the window's
// content view is the one this layer always has.
exports.watch = function watch(window, onchange) {
  window.contentView._native.on('didChangeEffectiveAppearance', () =>
    onchange(exports.read(window))
  )
}
