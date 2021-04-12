const path = require('path');

module.exports = {
  entry: {
    "dropp": "./src/dropp.js",
    "dropp-frontend": "./src/dropp-frontend.js"
    // "dropp-merchant-sign": "./src/dropp-merchant-sign.js"
  },
  // entry: ['./src/dropp.js', './src/dropp-merchant-sign.js'],
  output: {
    filename: '[name].min.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
};