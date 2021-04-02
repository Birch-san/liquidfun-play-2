# liquidfun-play

**Note: currently requires Chrome/Chromium-based browser.**

Demonstrates functionality of [box2d-wasm](https://github.com/Birch-san/box2d-wasm)'s [liquidfun](https://github.com/Birch-san/box2d-wasm/releases/tag/v4.0.0-liquidfun.0) release.

Main aim was to achieve high framerate by:

- avoiding allocations
  - `new`
  - `[]`
  - `{}`
- physics via WebAssembly in a web worker
- rendering in WebGL

## Usage

```bash
npm start
```

Runs the app in the development mode.
Open http://localhost:8080 to view it in the browser.