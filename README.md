# liquidfun-play

**Note: currently requires Chrome/Chromium-based browser.**

Demonstrates functionality of [box2d-wasm](https://github.com/Birch-san/box2d-wasm)'s [liquidfun](https://github.com/Birch-san/box2d-wasm/releases/tag/v4.0.0-liquidfun.0) release.

Main aim was to achieve high framerate by:

- avoiding allocations in main loop
  - no `new`
  - no `[]`
  - no `{}`
  - pre-allocate structures
  - fewer allocations = (fewer?) (shorter?) GC pauses
- minimize JS->wasm calls in favour of accessing Emscripten heap directly
  - well, [maybe this doesn't matter](https://hacks.mozilla.org/2018/10/calls-between-javascript-and-webassembly-are-finally-fast-%F0%9F%8E%89/)
- physics via WebAssembly in a web worker
- rendering in WebGL
  - renderer is in same thread as physics… not ideal, but makes the timing easy to reason about, and eliminates need to post world state to another thread.
    - maybe [SharedArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer) would be an alternative which cheaply enables another thread to render the world state.

## Usage

```bash
npm start
```

Runs the app in the development mode.
Open http://localhost:8080 to view it in the browser.