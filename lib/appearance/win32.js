const WinUIFrameworkElement = require('bare-win-ui/framework-element')

const { ELEMENT_THEME } = WinUIFrameworkElement

const THEMES = { light: ELEMENT_THEME.LIGHT, dark: ELEMENT_THEME.DARK }

// XAML keeps a theme on the element rather than on the application, and an
// element inherits it from its parent, so the window's content is where one
// is asked for and where what is drawn is read back.
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
