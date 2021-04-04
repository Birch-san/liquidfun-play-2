const { dirname, resolve } = require('path')
const { DefinePlugin } = require('webpack')

/**
 * @param {string} str
 * @returns string
 */
const escapeRegExp = (str) =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: { url: '/', static: true },
    [dirname(require.resolve('box2d-wasm'))]: { url: '/box2d-wasm', static: true },
    src: { url: '/dist' }
  },
  plugins: [
    '@snowpack/plugin-svelte',
    ['@snowpack/plugin-typescript', { args: '--project ./src/main' }],
    ['@efox/snowpack-plugin-webpack5', {
      extendConfig: (config) => {
        Object.assign(config.resolve.fallback ??= {}, { fs: false, path: false });
        (config.experiments ??= {}).topLevelAwait = true
        config.plugins.push(new DefinePlugin({
          __SNOWPACK_ENV__: JSON.stringify('production')
        }))
        config.resolve.alias['box2d-wasm'] = resolve(dirname(require.resolve('box2d-wasm')), '../umd/Box2D.js')
        // config.output.publicPath = '/box2d-wasm-liquidfun-2/'

        // // /Users/birch/git/liquidfun-play/node_modules/babel-loader/lib/index.js??ruleSet[1].rules[0].use[0]!/Users/birch/git/liquidfun-play/node_modules/@efox/snowpack-plugin-webpack5/plugins/import-meta-fix.js!/Users/birch/git/liquidfun-play/node_modules/@efox/snowpack-plugin-webpack5/plugins/proxy-import-resolve.js!/Users/birch/git/liquidfun-play/build/_snowpack/pkg/box2d-wasm.js
        // const box2DWasmImportPath = resolve(__dirname, 'build/_snowpack/pkg/box2d-wasm.js')
        // // config.module.noParse = (resource) => matcher.test(resource)
        // const matcher = new RegExp(`(!|^)${escapeRegExp(box2DWasmImportPath)}$`)
        // config.module.noParse = (resource) => {
        //   const cond = matcher.test(resource)
        //   console.log(cond, resource)
        //   return cond
        // }

        config.optimization.minimizer.pop()

        console.log(config)
        return config
      }
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
    /* ... */
  }
}
