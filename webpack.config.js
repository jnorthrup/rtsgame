import path from 'path';
import { fileURLToPath } from 'url';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import webpack from 'webpack'; // Required for HotModuleReplacementPlugin
import CompressionPlugin from 'compression-webpack-plugin';

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
    filename: isProduction ? '[name].[contenthash].bundle.js' : '[name].bundle.js',
    publicPath: '/',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name][ext]'
        }
      },
      {
        test: /\.obj$/,
        type: 'asset/resource',
        generator: {
          filename: 'models/[name][ext]'
        }
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './index.html',
      filename: 'index.html',
      inject: 'body',
      chunks: ['app']
    }),
    ...(isProduction ? [] : [new webpack.HotModuleReplacementPlugin()]),
    new CompressionPlugin({
      test: /\.(js|css|html|obj)$/i,
      algorithm: 'gzip',
      threshold: 8192,
      minRatio: 0.8,
    }),
  ],
  devtool: isProduction ? 'source-map' : 'eval-source-map',
  devServer: {
    static: [
      {
        directory: path.join(__dirname, 'dist'),
      },
      {
        directory: path.join(__dirname, 'models'),
        publicPath: '/models',
      }
    ],
    compress: true,
    port: 9001,
    hot: true,
    open: true,
    historyApiFallback: true,
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
  resolve: {
    extensions: ['.js'],
    alias: {
      '@config': path.resolve(__dirname, 'js/config'),
      '@core': path.resolve(__dirname, 'js/core'),
      '@ai': path.resolve(__dirname, 'js/ai'),
      '@ui': path.resolve(__dirname, 'js/ui'),
      '@rewritten': path.resolve(__dirname, 'js_rewritten'),
    }
  },
  optimization: {
    minimize: isProduction,
    sideEffects: true,
    usedExports: true,
    splitChunks: {
      chunks: 'all',
      name: false,
    },
  },
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 1000000,
    maxAssetSize: 1000000
  },
  stats: {
    assets: true,
    modules: false,
    chunks: false,
    warnings: true,
    errors: true,
    errorDetails: true,
  }
};