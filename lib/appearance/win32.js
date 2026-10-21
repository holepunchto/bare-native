const WinUIFrameworkElement = require('bare-win-ui/framework-element')

const { ELEMENT_THEME } = WinUIFrameworkElement

const THEMES = { light: ELEMENT_THEME.LIGHT, dark: ELEMENT_THEME.DARK }

// XAML themes live on elements and are inherited, so the window's content is the root.
function root(window) {
  return window.contentView._native
}

exports.read = function read(window) {
  return root(window).actualTheme === ELEMENT_THEME.DARK ? 'dark' : 'light'
}

exports.write = function write(window, colorScheme) {
  root(window).requestedTheme = colorScheme === null ? ELEMENT_THEME.DEFAULT : THEMES[colorScheme]
}

exports.watch = function watch(window, onchange) {
  root(window).on('actualThemeChanged', () => onchange(exports.read(window)))
}
