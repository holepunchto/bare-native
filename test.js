require('./test/style')
require('./test/tree')
require('./test/layout')
require('./test/transform')
require('./test/text')
require('./test/scroll-view')
require('./test/controls')
require('./test/image')
require('./test/web-view')
require('./test/window')
require('./test/platform')

// Last, as on Android the overlay replaces the window the other tests share.
require('./test/overlay')
