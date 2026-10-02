const GTKSettings = require('bare-gtk/settings')

// GTK has the half of this that an application says and not the half it asks.
// A stylesheet is told whether to prefer the dark variant, which is what is
// drawn and what can be read back, and there is no GTK call for what the
// desktop itself prefers: GNOME keeps that in a setting of its own and only
// libadwaita reads it. So the system is never asked here, and dropping the
// scheme puts back what the theme arrived with rather than following anything.
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
  settings().on('prefer-dark-theme', () => onchange(exports.read(window)))
}
