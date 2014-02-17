var debug   = require('debug')('deviant')
var map     = require('map-stream')
var from    = require('new-from')
var resolve = require('resolve')
var findup  = require('findup')
var split   = require('split')
var path    = require('path')
var net     = require('net')
var fs      = require('fs')

var transforms = []
var handle     = {}

var portFile = process.argv[2]
var port     = 1280
var retries  = 100
var server

function connection(client) {
  debug('incoming connection to server')

  client
    .pipe(split())
    .pipe(map(parse))
    .on('data', function(data) {
      handle[data.key](client, data.value)
    })
}

// We can't guarantee that port 1280
// won't ever be taken, especially if
// there are multiple instances of deviant
// running.
//
// This repeatedly attempts to listen to ports,
// starting at 1280 and then slowly increasing
// until finding one that is free, or failing
// at 100 retries.
listen()
function listen() {
  debug('trying port %s', port)

  server = net.createServer(connection)
  server.listen(port).once('error', function(err) {
    if (retries-- > 0) return listen(++port)
    err.message += ' (port: ' + port +')'
    throw err
  }).on('listening', function() {
    debug('got port %s', port)
    fs.writeFile(portFile, String(port))
  })
}

function parse(data, next) {
  if (!data.trim()) return next()

  try {
    data = JSON.parse(data)
  } catch(err) {
    return next(err)
  }

  next(null, data)
}

function stringify(data, next) {
  return next(null, JSON.stringify(data) + '\n')
}

handle['transform'] = function(client, value) {
  var file   = value.file
  var code   = value.code
  var base   = value.base
  var root   = value.root
  var isRoot = false

  findup(value.base, 'package.json', function(err, pkgDirectory) {
    isRoot = pkgDirectory === root
    if (err && err.message === 'not found') return next({})

    // throws will get caught by
    // the parent process
    if (err) throw err

    var pkgFile = path.join(pkgDirectory, 'package.json')

    fs.readFile(pkgFile, 'utf8', function(err, pkg) {
      if (err) throw err
      next(JSON.parse(pkg))
    })
  })

  function next(pkg) {
    var transforms = pkg && (
      pkg['deviant'] &&
      pkg['deviant']['transform']
    ) || (
      pkg['browserify'] &&
      pkg['browserify']['transform']
    )

    transforms = Array.isArray(transforms)
      ? transforms
      : transforms
        ? [transforms]
        : []

    if (isRoot) transforms = transforms
      .concat(value.transforms)

    transforms = transforms.map(function(tr) {
      return require(
        resolve.sync(tr, { basedir: base })
      )
    })

    var output = from([ code ])
    var queued = output

    while (transforms.length) {
      var tr = transforms.shift()(file, {})
      queued = queued.pipe(tr)
    }

    queued.pipe(client)
  }
}
