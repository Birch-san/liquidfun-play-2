const { dirname } = require('path')

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    public: { url: '/', static: true },
    [dirname(require.resolve('box2d-wasm'))]: { url: '/box2d-wasm', static: true },
    src: { url: '/dist' }
  },
  plugins: [
    '@snowpack/plugin-svelte',
    ['@snowpack/plugin-typescript', { args: '--project ./src/main' }]
  ],
  routes: [
    /* Enable an SPA Fallback in development: */
    // {"match": "routes", "src": ".*", "dest": "/index.html"},
  ],
  optimize: {
    /* Example: Bundle your final build: */
    // "bundle": true,
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
