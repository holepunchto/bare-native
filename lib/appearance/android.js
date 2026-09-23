const NDKActivity = require('bare-ndk/activity')
const NDKResources = require('bare-ndk/resources')
const NDKUiModeManager = require('bare-ndk/ui-mode-manager')

const { UI_MODE_NIGHT } = NDKResources
const { MODE_NIGHT } = NDKUiModeManager

const MODES = { light: MODE_NIGHT.NO, dark: MODE_NIGHT.YES }

// Android keeps the night mode in the configuration rather than on a widget,
// which is why the manifest has to name `uiMode` among the changes the
// activity survives: without it the process is torn down and started again
// instead of hearing about one.
exports.read = function read(window) {
  const { uiMode } = NDKActivity.resources.configuration

  return (uiMode & UI_MODE_NIGHT.MASK) === UI_MODE_NIGHT.YES ? 'dark' : 'light'
}

exports.write = function write(window, colorScheme) {
  NDKUiModeManager.setApplicationNightMode(
    colorScheme === null ? MODE_NIGHT.AUTO : MODES[colorScheme]
  )
}

exports.watch = function watch(window, onchange) {
  window.contentView._native.on('configurationChanged', () => onchange(exports.read(window)))
}
