var path   = require('path')
var net    = require('net')

var port   = parseInt(process.argv[2], 10)
var code   = process.argv[3] // file contents
var file   = process.argv[4] // absolute file path
var root   = process.argv[5] // root package.json directory
var tran   = process.argv[6] // transforms, as JSON
var base   = path.dirname(file)

var client = net.connect(port
  , null
  , connected
)

function connected() {
  var input = JSON.stringify({
      key: 'transform'
    , value: {
        code: code
      , file: file
      , base: base
      , root: root
      , transforms: JSON.parse(tran)
    }
  }) + '\n'

  while (input.length < 4096) {
    input += '\n'
  }

  client.resume()
  client.write(input)

  client.pipe(process.stdout)
}
