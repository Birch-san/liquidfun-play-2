import Box2DFactory from 'box2d-wasm'

export interface Data {
  message: string
}

const data: Data = {
  message: 'hey'
}

self.postMessage(data)

const box2D: typeof Box2D & EmscriptenModule = await Box2DFactory({
  /**
   * By default, this would request /_snowpack/pkg/Box2D.wasm
   * @example (url, scriptDirectory) => `${scriptDirectory}${url}`
   * But we want to request /box2d-wasm/Box2D.wasm
   * so we climb out of /dist/ and into its sibling, /box2d-wasm/
   */
  locateFile: (url: string): string =>
    `${new URL('../../box2d-wasm', import.meta.url).toString()}/${url}`
})

const {
  b2_dynamicBody,
  b2BodyDef,
  b2Draw: {
    e_shapeBit,
    e_particleBit
  },
  b2Fixture,
  b2Vec2,
  b2World,
  destroy,
  JSQueryCallback,
  wrapPointer
} = box2D

const gravity = new b2Vec2(0.0, -10.0)
const world = new b2World(gravity)

const timeStepMs = 1 / 10 * 1000

setInterval(() => {
  world.Step(timeStepMs, 1, 1, 1)
}, timeStepMs)