import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'production',
  entry: {
    // Main bundle combining all game modules
    'game-bundle': {
      import: [
        './js_rewritten/core/simulation.js',
        './js_rewritten/rendering/webglRenderer.js',
        './js_rewritten/config/modelDefaults.js',
        './js/core/game.js',
        './js/core/terrainManager.js',
        './js/core/projectile.js',
        './js/core/recordingUtils.js',
        './js/ai/commandHierarchy.js',
        './js/ai/battleJournal.js',
        './js/ui/borderLayout.js',
        './js/ui/commandStatusRenderer.js',
        './js/ui/talentRenderers.js',
        './js/pathfinding/astar.js',
        './js/config/simulationConfig.js'
      ],
      filename: 'webpack-bundle.js'
    }
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    library: 'RTSGame',
    libraryTarget: 'umd',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  browsers: ['> 1%', 'last 2 versions']
                },
                modules: false
              }]
            ]
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js'],
    alias: {
      '@config': path.resolve(__dirname, 'js/config'),
      '@core': path.resolve(__dirname, 'js/core'),
      '@ai': path.resolve(__dirname, 'js/ai'),
      '@ui': path.resolve(__dirname, 'js/ui'),
      '@rewritten': path.resolve(__dirname, 'js_rewritten')
    }
  },
  optimization: {
    minimize: true,
    sideEffects: false,
    usedExports: true
  },
  performance: {
    hints: 'warning',
    maxEntrypointSize: 1000000, // 1MB
    maxAssetSize: 1000000
  },
  stats: {
    assets: true,
    modules: false,
    chunks: false,
    warnings: true,
    errors: true
  }
};