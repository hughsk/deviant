var debug    = require('debug')('transmogrified')
var spawn    = require('child_process').spawn
var exec     = require('execSync').exec
var Module   = require('module')
var findup   = require('findup')
var which    = require('which')
var path     = require('path')

var tClient  = require.resolve('./transform-client')
var tServer  = require.resolve('./transform-server')
var node     = which.sync('node')
var server   = spawn(node, [tServer])

var _compile = Module.prototype._compile
var root     = module.parent ? module.parent.filename : __filename
var rootdir  = findup.sync(path.dirname(root), 'package.json')
var ready    = false
var port

var defaultTransforms = []

module.exports = initialLoad

server.stderr.pipe(process.stderr)
server.stdout.once('data', function(_port) {
  debug('informed of port: %s', _port)
  port  = String(_port)
  server.emit('ready')
  server.removeAllListeners('ready')
  ready = true
})

Module.prototype._compile = deviantTransform

function deviantTransform(content, filename) {
  debug('sending %s', filename)

  // It's pretty expensive to spawn a new process, so:
  // * Perform a quick check of the package.json for module files
  // * Unconditionally attempt to transform from project files
  var isModule = path.relative(
    rootdir, filename
  ).indexOf('node_modules') !== -1

  if (!isModule) {
    content = applyTransform(content, filename)
  } else {
    var nearest = findup.sync(path.dirname(filename), 'package.json')
    var pkg = require(path.join(nearest, 'package.json'))
    var transforms = pkg && (
      pkg['nodify'] &&
      pkg['nodify']['transform']
    ) || (
      pkg['browserify'] &&
      pkg['browserify']['transform']
    )

    if (Array.isArray(transforms)
      ? transforms.length
      : transforms
    ) content = applyTransform(content, filename)
  }

  return _compile.call(this, content, filename)
}

function applyTransform(content, filename) {
  var cmd = 'node ' + quote([
      tClient
    , port
    , content
    , filename
    , rootdir
    , JSON.stringify(defaultTransforms)
  ])

  content = exec(cmd)

  debug('exit code %s', content.code)
  debug('buffer size %s', content.stdout.length)

  if (content.code !== 0) {
    console.error('(TRANSFORM STREAM ERROR)')
    console.error(content.stdout)
    return process.exit(content.code)
  }

  return content.stdout
}

function quote(arr) {
  return "'" + arr.map(function(arg) {
    return arg.replace(/\'/g, "'\"'\"'")
  }).join("' '") + "'"
}

function addTransforms(arr) {
  if (!arr) return
  arr = Array.isArray(arr) ? arr : [arr]
  if (!arr.length) return
  ;[].push.apply(defaultTransforms, arr)
}

function initialLoad(arr, start) {
  if (typeof arr === 'function') {
    start = arr
    arr = []
  }

  addTransforms(arr)
  if (ready) return start()
  server.on('ready', start)
}
