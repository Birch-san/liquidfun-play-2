// this redundant triple-slash directive seems to be the only way for the types to survive into the emitted /dist/common/*.d.ts
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="box2d-wasm" />
import Box2DFactory from 'box2d-wasm'

export const box2D: typeof Box2D & EmscriptenModule = await Box2DFactory({
  /**
   * By default, this would request /_snowpack/pkg/Box2D.wasm
   * @example (url, scriptDirectory) => `${scriptDirectory}${url}`
   * But we want to request /box2d-wasm/Box2D.wasm
   * so we climb out of /dist/ and into its sibling, /box2d-wasm/
   */
  locateFile: (url: string): string =>
    `${new URL('../../box2d-wasm', import.meta.url).toString()}/${url}`
})