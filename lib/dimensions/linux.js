const GTKSettings = require('bare-gtk/settings')

// The unscaled `gtk-xft-dpi`, in 1024ths of a DPI. Desktops scale text by raising it.
const XFT_DPI = 96 * 1024

function settings() {
  return GTKSettings.getDefault()
}

exports.read = function read(window) {
  const surface = window.native.surface

  // A window has no surface until it has been mapped.
  const monitor = surface === null ? null : surface.display.getMonitorAtSurface(surface)

  const { width, height } = monitor === null ? { width: 0, height: 0 } : monitor.geometry

  const { xftDpi } = settings()

  return {
    screen: { width, height },
    scale: window.scale,
    fontScale: xftDpi <= 0 ? 1 : xftDpi / XFT_DPI
  }
}

exports.watch = function watch(window, onchange) {
  settings().on('xftDpi', onchange)
}
