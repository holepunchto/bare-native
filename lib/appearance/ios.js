const UIKitView = require('bare-ui-kit/view')

const { USER_INTERFACE_STYLE } = UIKitView

const STYLES = { light: USER_INTERFACE_STYLE.LIGHT, dark: USER_INTERFACE_STYLE.DARK }

// The window is what a style is overridden on, because an override is
// inherited by everything under the view it is set on and the window is the
// root of that tree.
function root(window) {
  return window.native
}

exports.read = function read(window) {
  return root(window).userInterfaceStyle === USER_INTERFACE_STYLE.DARK ? 'dark' : 'light'
}

exports.write = function write(window, colorScheme) {
  root(window).overrideUserInterfaceStyle =
    colorScheme === null ? USER_INTERFACE_STYLE.UNSPECIFIED : STYLES[colorScheme]
}

exports.watch = function watch(window, onchange) {
  window.contentView._native.on('traitChange', () => onchange(exports.read(window)))
}
