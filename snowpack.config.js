const { dirname } = require('path')
const { DefinePlugin } = require('webpack')

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
        destination: 'build/box2d-wasm'
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
    baseUrl: 'https://birchlabs.co.uk/liquidfun-wasm/'
    /* ... */
  }
}
