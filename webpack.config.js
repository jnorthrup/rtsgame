import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack'; // Required for HotModuleReplacementPlugin

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';

export default {
  mode: isProduction ? 'production' : 'development',
  entry: {
    app: './js/app.js' // Consolidated entry point
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: isProduction ? '[name].[contenthash].bundle.js' : '[name].bundle.js', // Add contenthash for production
    publicPath: '/', // Important for dev-server and HTML plugin paths
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  browsers: ['> 1%', 'last 2 versions', 'not dead']
                }
              }],
              ['@babel/preset-react', {
                runtime: 'automatic'
              }]
            ],
            plugins: []
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'] // Process CSS files
      },
      { // For serving assets like models, images from their original locations if referenced in JS/CSS
        test: /\.(obj|png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html', // Use existing index.html as a template
      filename: 'index.html',   // Output filename
      inject: 'body',          // Inject script tags into the body
      chunks: ['app']          // Only include the 'app' chunk
    }),
    ...(isProduction ? [] : [new webpack.HotModuleReplacementPlugin()]) // Enable HMR only in development
  ],
  devtool: isProduction ? 'source-map' : 'eval-source-map',
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'), // Serve from dist
    },
    compress: true,
    port: 9000,
    hot: true, // Enable HMR on the server
    open: true, // Open browser after server starts
    historyApiFallback: true, // For single-page applications
  },
  resolve: {
    extensions: ['.js', '.jsx'], // Add .jsx
    alias: { // Kept existing aliases, review if still needed
      '@config': path.resolve(__dirname, 'js/config'),
      '@core': path.resolve(__dirname, 'js/core'),
      '@ai': path.resolve(__dirname, 'js/ai'),
      '@ui': path.resolve(__dirname, 'js/ui'),
      '@rewritten': path.resolve(__dirname, 'js_rewritten'),
      // Add alias for models if they are imported from JS, e.g.
      // '@models': path.resolve(__dirname, 'models')
    }
  },
  optimization: {
    minimize: isProduction, // Minimize only in production
    // TerserWebpackPlugin is used by default in Webpack 5 for minification
    sideEffects: true, // Changed to true for better tree shaking with package.json "sideEffects"
    usedExports: true
  },
  performance: {
    hints: isProduction ? 'warning' : false, // Show hints only in production
    maxEntrypointSize: 1000000, 
    maxAssetSize: 1000000
  },
  stats: {
    assets: true,
    modules: false,
    chunks: false,
    warnings: true,
    errors: true,
    errorDetails: true, // Show more details on errors
  }
};