const platform = require('#overlay')
const ScrollView = require('./scroll-view')
const Text = require('./text')
const View = require('./view')
const Window = require('./window')

const TITLES = {
  compile: 'Compile error',
  evaluate: 'Evaluation error',
  dispose: 'Dispose error',
  accept: 'Accept error',
  plugin: 'Plugin error',
  runtime: 'Runtime error'
}

const palette = {
  background: '#1c1c22',
  surface: '#26262e',
  text: '#f2f2f7',
  muted: '#a0a0ab',
  danger: '#ff6b81',
  button: '#3a3a44'
}

const TRACE = { flex: 1, backgroundColor: palette.surface, borderRadius: 8 }

// Drawn by the host rather than the application, as a graph that throws while building leaves
// nothing running to draw it.
module.exports = function overlay(refresh) {
  const overlay = new Overlay(refresh)

  refresh
    .on('error', (err, report) => overlay.show(report))
    .on('refresh', () => overlay.hide(false))
    .on('reload', () => overlay.hide(true))

  return overlay
}

class Overlay {
  constructor(refresh) {
    this._refresh = refresh
    this._window = null
    this._nodes = null
    this._shown = false
  }

  get shown() {
    return this._shown
  }

  get window() {
    return this._window
  }

  // The refresh loop already prints transport failures.
  show(report) {
    if (report.phase === 'transport') return

    // Throwing would escape the host's error handling, so retry once with a new window, such as
    // when the user closed the old one.
    try {
      this._present(report)
    } catch {
      this._window = null

      try {
        this._present(report)
      } catch (err) {
        console.error(err)
      }
    }
  }

  hide(replaced) {
    if (!this._shown) return

    this._shown = false

    if (!platform.hide(this._window, replaced ? null : () => this._reload())) {
      this._window = null
    }
  }

  _present(report) {
    if (this._window === null) {
      this._nodes = build({
        dismiss: () => this.hide(false),
        reload: () => this._reload()
      })

      this._window = new Window(640, 480)

      this._window.content(this._nodes.root)
    }

    const { title, location, message, status, trace, stack } = this._nodes

    title.text = TITLES[report.phase] || 'Error'
    location.text = report.href || ''
    message.text = `${report.name}: ${report.message}`
    status.text =
      report.intact && this._refresh.running
        ? 'The application is still running.'
        : 'Nothing is running until an edit fixes this.'
    stack.text = frames(report)
    trace.style = { ...TRACE, display: stack.text === '' ? 'none' : 'flex' }

    this._window.layout()
    this._window.show()

    this._shown = true
  }

  _reload() {
    this._refresh.reload().catch(noop)
  }
}

function build({ dismiss, reload }) {
  const title = text({ fontSize: 17, fontWeight: 600, color: palette.danger })
  const location = text({ fontSize: 12, fontFamily: 'monospace', color: palette.muted })
  const message = text({ fontSize: 15, color: palette.text })
  const status = text({ fontSize: 13, color: palette.muted })
  const stack = text({ fontSize: 12, fontFamily: 'monospace', color: palette.text })

  const trace = new ScrollView()

  trace.style = TRACE
  trace.contentStyle = { padding: 12 }
  trace.appendChild(stack)

  const actions = view(
    { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 'auto' },
    [button('Dismiss', dismiss), button('Reload', reload)]
  )

  const body = view({ flex: 1, padding: 16, gap: 12 }, [
    title,
    location,
    message,
    status,
    trace,
    actions
  ])

  const root = view(
    {
      flex: 1,
      backgroundColor: palette.background,
      paddingTop: 'env(safe-area-inset-top)',
      paddingRight: 'env(safe-area-inset-right)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)'
    },
    [body]
  )

  return { root, title, location, message, status, trace, stack }
}

function view(style, children) {
  const node = new View()

  node.style = style

  for (const child of children) node.appendChild(child)

  return node
}

function text(style, value = '') {
  const node = new Text(value)

  node.style = style

  return node
}

function button(label, onpress) {
  const node = view(
    {
      backgroundColor: palette.button,
      borderRadius: 8,
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 14,
      paddingRight: 14
    },
    [text({ fontSize: 13, fontWeight: 600, color: palette.text }, label)]
  )

  node.on('pointerup', onpress)

  return node
}

// Keeps the application's frames, dropping those of its dependencies when it has any of its own.
function frames({ stack }) {
  if (stack === null) return ''

  const frames = stack.split('\n').filter((line) => /^\s*at (.*\()?\//.test(line))

  const own = frames.filter((line) => !line.includes('/node_modules/'))

  return (own.length > 0 ? own : frames).map((line) => line.trim()).join('\n')
}

function noop() {}
