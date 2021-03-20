// import Box2DFactory from 'box2d-wasm'
import { x } from './lib'

export interface Data {
  message: string
}

const data: Data = {
  message: x
}

self.postMessage(data)

// const box2D: typeof Box2D & EmscriptenModule = await Box2DFactory({
//   /**
//    * By default, this looks for Box2D.wasm relative to public/build/bundle.js:
//    * @example (url, scriptDirectory) => `${scriptDirectory}${url}`
//    * But we want to look for Box2D.wasm relative to public/index.html instead.
//    */
//   //  locateFile: url => url
// })