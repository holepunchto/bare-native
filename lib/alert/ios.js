const UIKitAlertAction = require('bare-ui-kit/alert-action')
const UIKitAlertController = require('bare-ui-kit/alert-controller')

const { STYLE } = UIKitAlertAction

const STYLES = {
  default: STYLE.DEFAULT,
  cancel: STYLE.CANCEL,
  destructive: STYLE.DESTRUCTIVE
}

exports.alert = function alert(window, title, message, buttons) {
  const { promise, resolve } = Promise.withResolvers()

  const controller = new UIKitAlertController({ title, message })

  buttons.forEach((button, index) => {
    const action = new UIKitAlertAction({ title: button.text, style: STYLES[button.style] })

    action.on('selected', () => resolve(index))

    controller.addAction(action)
  })

  window.native.rootViewController.present(controller)

  return promise
}
