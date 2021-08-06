const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const { dirname, resolve } = require('path')
const { DefinePlugin } = require('webpack')

const { baseUrl, out } = yargs(hideBin(process.argv))
  .options({
    baseUrl: { type: 'string', default: 'http://localhost/', alias: 'base-url' },
    out: { type: 'string', default: 'build', alias: 'out-dir' }
  }).argv

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: { url: '/', static: true },
    [dirname(require.resolve('box2d-wasm'))]: { url: '/box2d-wasm', static: true },
    src: { url: '/dist' }
  },
  plugins: [
    '@snowpack/plugin-svelte',
    ['@snowpack/plugin-typescript', { args: '--project ./src' }],
    ['@snowpack/plugin-webpack', {
      /** @param {import("webpack").Configuration } config */
      extendConfig: (config) => {
        Object.assign(config.resolve.fallback ??= {}, { fs: false, path: false });
        (config.experiments ??= {}).topLevelAwait = true
        config.plugins.push(new DefinePlugin({
          __SNOWPACK_ENV__: JSON.stringify('production')
        }))
        return config
      }
    }],
    ['snowpack-plugin-copy', {
      patterns: [{
        source: dirname(require.resolve('box2d-wasm')),
        destination: resolve(out, 'box2d-wasm')
      }]
    }]
  ],
  routes: [
    /* Enable an SPA Fallback in development: */
    // {"match": "routes", "src": ".*", "dest": "/index.html"},
  ],
  optimize: {
    /* Example: Bundle your final build: */
    // bundle: true
  },
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    baseUrl,
    out,
    /* ... */
  }
}
