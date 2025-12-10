# bare-native

Native application development framework for Bare. It provides a common set of UI primitives backed by the native platform UI toolkits, built on top of the Bare native addon system. This means that all native code is neatly tucked away and delivered to developers as prebuilt binaries, [no compilation required](https://xkcd.com/303/).

```
npm i bare-native
```

## Usage

```js
const { Window } = require('bare-native')

const window = new Window(400, 250)

window.show()
```

<https://github.com/holepunchto/bare-build> is used to package your application code alongside a Bare runtime suitable for the target platform. Either install the tool globally or as a development dependency of your project:

```
npm i [-g|-D] bare-build
```

Next, build your application for the target platform, telling `bare-build` to use the `bare-native` runtime:

```
bare-build --out <dir> --target <platform>-<arch> --runtime bare-native/runtime app.js
```

## License

Apache-2.0
