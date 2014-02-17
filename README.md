# deviant [![Flattr this!](https://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?user_id=hughskennedy&url=http://github.com/hughsk/deviant&title=deviant&description=hughsk/deviant%20on%20GitHub&language=en_GB&tags=flattr,github,javascript&category=software)[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://github.com/hughsk/stability-badges) #

Deviant breaks the rules a bit and overrides node's builtin `require`
behavior to allow you to use [browserify](http://browserify.org)'s
[transform streams](https://github.com/substack/module-deps#transforms)
directly in node.

This is handy for a few reasons, for example using
[installify](http://github.com/hughsk/installify) to automatically install
missing dependencies, [es6ify](https://github.com/thlorenz/es6ify) to get a
bunch of ES6 features without needing to use the `--harmony` flag, or
[sweetify](https://github.com/andreypopp/sweetify) to get hygenic macros from
[sweet.js](http://sweetjs.org/).

You can find a list of browserify transforms
[here](https://github.com/substack/node-browserify/wiki/list-of-transforms).

## Usage ##

[![deviant](https://nodei.co/npm/deviant.png?mini=true)](https://nodei.co/npm/deviant)

The easiest way to get started is from the command-line, using the `-t`
argument as you would with browserify to add transforms:

``` bash
# Install the command-line tool globally
$ npm install -g deviant
# Followed by your source transform modules:
$ npm install coffeeify installify
# Then you're good to go:
$ deviant -t coffeeify -t installify ./index.coffee
```

If you prefer to load deviant directly, you just have to run the following
code *before* making any other calls to require:

``` javascript
// Specify the transforms you want to use
// here, if any
require('deviant')([
    'es6ify'
  , 'sweetify'
  , 'installify'
])

// Now you can make require calls
// as usual, but with transforms
// enabled
require('./app')
```

## How does it work? ##

Using the [execSync](http://npmjs.org/package/execSync) module, we can fork
out to a separate process to get the results of a transform synchronously. It's
pretty hacky, but I believe the functionality is coming to
[node 0.12.x](https://github.com/joyent/node/blob/e8df2676748e944388896dfd767e01906ae2e4eb/lib/child_process.js#L1319-L1331).

Launching a new process is expensive – especially when it's pulling in a lot of
dependencies – so a TCP server is created and kept alive, with `execSync` being
used to spawn light processes which just pipe the data onto the server while
still blocking the main loop. The server has to be run in a separate process,
because otherwise `execSync` will block it and prevent the response from ever
being recieved.

Overriding require is done by replacing `Module.prototype._compile`, e.g:

``` javascript
// This will read in all of your dependencies
// uppercased, and probably breaking them in
// the process:
var Module = require('module')
var _compile = Module.prototype._compile

Module.prototype._compile = function(content, filename) {
  content = content.toUpperCase()
  return _compile.call(this, content, filename)
}
```

## License ##

MIT. See [LICENSE.md](http://github.com/hughsk/deviant/blob/master/LICENSE.md) for details.
