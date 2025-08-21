const path = require('path');

module.exports = {
  mode: 'development',
  entry: path.resolve(__dirname, 'js/main.js'),
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '/',
  },
  devServer: {
    static: path.resolve(__dirname, 'public'),
    port: 8080,
    hot: true,
    open: false,
  },
  resolve: {
    extensions: ['.js']
  },
};
