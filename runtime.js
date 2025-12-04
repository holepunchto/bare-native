const AppKit = require('bare-app-kit/runtime')
const GTK = require('bare-gtk/runtime')
const WinUI = require('bare-win-ui/runtime')

exports.prebuilds = {
  ...AppKit.prebuilds,
  ...GTK.prebuilds,
  ...WinUI.prebuilds
}
