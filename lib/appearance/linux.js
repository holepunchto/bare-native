const GTKSettings = require('bare-gtk/settings')

// GTK cannot report the desktop's preferred scheme, so clearing the scheme restores the
// theme's initial setting rather than following the system.
let initial = null

function settings() {
  const defaults = GTKSettings.getDefault()

  if (initial === null) initial = defaults.preferDarkTheme

  return defaults
}

exports.read = function read(window) {
  return settings().preferDarkTheme ? 'dark' : 'light'
}

exports.write = function write(window, colorScheme) {
  const defaults = settings()

  defaults.preferDarkTheme = colorScheme === null ? initial : colorScheme === 'dark'
}

exports.watch = function watch(window, onchange) {
  settings().on('preferDarkTheme', () => onchange(exports.read(window)))
}
