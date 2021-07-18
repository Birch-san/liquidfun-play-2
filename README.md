# liquidfun-play-2

<p>
    <a href="https://twitter.com/intent/follow?screen_name=Birchlabs">
        <img src="https://img.shields.io/twitter/follow/Birchlabs.svg?style=social&logo=twitter"/>
    </a>
</p>

**Note: Requires Chrome/Chromium-based browser in development. Firefox and Safari supported after production bundle.**

![](https://birchlabs.co.uk/box2d-wasm-liquidfun/liquidfun.gif)

[Demo](https://birchlabs.co.uk/box2d-wasm-liquidfun/)

Demonstrates functionality of [box2d-wasm](https://github.com/Birch-san/box2d-wasm)'s [liquidfun](https://github.com/Birch-san/box2d-wasm/releases/tag/liquidfun-v6.0.4) release.

Iterates on my previous [liquidfun-play](https://github.com/Birch-san/liquidfun-play) repository with the following changes:

- introduces WebAssembly SIMD optimization from newer box2d-wasm release
- no longer delegates physics to a Web Worker; workers have disadvantages:
  - more difficult to develop
  - various features either unsupported or complex to bundle for some browsers
  - the main thread had no work to do anyway! better to have fewer cores active, so CPU can boost to higher clock speeds
- implements water shaders from [Liquidfun's EyeCandy demo](https://github.com/google/liquidfun/blob/master/liquidfun/Box2D/EyeCandy/engine.cpp)

Achieves high framerate by:

- avoiding allocations in main loop
  - no `new`
  - no `[]`
  - no `{}`
  - pre-allocate structures
  - fewer allocations = (fewer?) (shorter?) GC pauses
- minimize JS->wasm calls in favour of accessing Emscripten heap directly
  - well, [maybe this doesn't matter](https://hacks.mozilla.org/2018/10/calls-between-javascript-and-webassembly-are-finally-fast-%F0%9F%8E%89/)
- physics via WebAssembly with SIMD acceleration
- rendering in WebGL

## Usage

```bash
npm start
```

Runs the app in the development mode.
Open http://localhost:8080 to view it in the browser.

## License

This repository is Zlib-licensed (full text in [LICENSE.zlib.txt](LICENSE.zlib.txt)).  
Additionally, contributions ported or adapted from the liquidfun repository are licensed as described in [LICENSE.liquidfun.txt](LICENSE.liquidfun.txt).