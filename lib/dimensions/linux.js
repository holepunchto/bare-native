const GTKSettings = require('bare-gtk/settings')

// The resolution GTK reports text at when nothing has been scaled, in the
// 1024ths `gtk-xft-dpi` is kept in. A desktop that scales text raises the
// setting rather than reporting a factor, so the factor is the ratio.
const XFT_DPI = 96 * 1024

function settings() {
  return GTKSettings.getDefault()
}

exports.read = function read(window) {
  const surface = window.native.surface

  // A window has no surface until it has been mapped, and no monitor until it
  // has one.
  const monitor = surface === null ? null : surface.display.getMonitorAtSurface(surface)

  const { width, height } = monitor === null ? { width: 0, height: 0 } : monitor.geometry

  const { xftDpi } = settings()

  return {
    screen: { width, height },
    scale: window.native.scaleFactor,
    fontScale: xftDpi <= 0 ? 1 : xftDpi / XFT_DPI
  }
}

exports.watch = function watch(window, onchange) {
  settings().on('xft-dpi', onchange)
}
