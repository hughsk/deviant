console.log('Running the example...')
console.log('This should compile a CoffeeScript file and run it.')
console.log(
    'The first time it runs'
  , '"chalk" will be installed automatically,'
  , 'using installify,'
  , 'which might take a while.'
)

var deviant = require('../')

deviant([
    'coffeeify'
  , 'installify'
])

require('./index.coffee')

