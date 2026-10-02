const WinUIClipboard = require('bare-win-ui/clipboard')
const WinUIDataPackage = require('bare-win-ui/data-package')
const WinUIDataPackageView = require('bare-win-ui/data-package-view')

const { TEXT } = WinUIDataPackageView.STANDARD_DATA_FORMATS
const { COPY } = WinUIDataPackage.OPERATION

exports.getString = function getString() {
  const content = WinUIClipboard.getContent()

  if (!content.contains(TEXT)) return Promise.resolve('')

  const { promise, resolve, reject } = Promise.withResolvers()

  content.getTextAsync((err, text) => {
    if (err !== null) reject(new Error(err))
    else resolve(text)
  })

  return promise
}

exports.setString = function setString(content) {
  const data = new WinUIDataPackage()

  data.requestedOperation = COPY
  data.setText(content)

  WinUIClipboard.setContent(data)
}

exports.hasString = function hasString() {
  return Promise.resolve(WinUIClipboard.getContent().contains(TEXT))
}
