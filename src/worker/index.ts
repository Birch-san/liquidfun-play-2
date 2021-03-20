export interface Data {
  message: string
}

const data: Data = {
  message: 'hey'
}

self.postMessage(data)

const { box2D } = await import('./box2d')
const { debugDraw } = await import('./debugDraw')

const {
  b2_dynamicBody,
  b2BodyDef,
  b2Fixture,
  b2Vec2,
  b2World,
  destroy,
  JSQueryCallback,
  wrapPointer
} = box2D

const gravity = new b2Vec2(0.0, -10.0)
const world = new b2World(gravity)
world.SetDebugDraw(debugDraw)

const timeStepMs = 1 / 10 * 1000

setInterval(() => {
  world.Step(timeStepMs, 1, 1, 1)
}, timeStepMs)