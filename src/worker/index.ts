import type { FromMain, ReadyFromWorker } from '../protocol'

self.onmessageerror = (event: MessageEvent) =>
  console.error('onmessageerror', event)
self.onerror = (event: ErrorEvent) =>
  console.error('onerror', event)

const { box2D } = await import('./box2d')
const { debugDraw } = await import('./debugDraw')

const {
  b2_dynamicBody,
  b2BodyDef,
  b2Vec2,
  b2PolygonShape,
  b2World,
  destroy
} = box2D

const gravity = new b2Vec2(0, 10)
const world = new b2World(gravity)
destroy(gravity)

world.SetDebugDraw(debugDraw)

const sideLengthMetres = 1
const square = new b2PolygonShape()
square.SetAsBox(sideLengthMetres / 2, sideLengthMetres / 2)

const zero = new b2Vec2(0, 0)

const bd = new b2BodyDef()
bd.set_type(b2_dynamicBody)
bd.set_position(zero)

const body = world.CreateBody(bd)
body.CreateFixture(square, 1)
body.SetTransform(zero, 0)
body.SetLinearVelocity(zero)
body.SetAwake(true)
body.SetEnabled(true)
destroy(bd)

let renderedThisFrame = false
const physicsIntervalMs = 1 / 1 * 1000

setInterval(() => {
  world.Step(physicsIntervalMs, 1, 1, 1)
  renderedThisFrame = false
}, physicsIntervalMs)

const onContext = (ctx: WebGL2RenderingContext): void => {
  const render: FrameRequestCallback = (): void => {
    if (!renderedThisFrame) {
      world.DebugDraw()
      renderedThisFrame = true
    }
    requestAnimationFrame(render)
  }
  requestAnimationFrame(render)
}

self.onmessage = ({ data }: MessageEvent<FromMain>) => {
  if (data.type === 'offscreenCanvas') {
    const ctx: WebGL2RenderingContext | null = data.offscreenCanvas.getContext('webgl2')
    if (ctx === null) {
      throw new Error('Failed to create WebGL2 rendering context')
    }
    onContext(ctx)
  }
}

const data: ReadyFromWorker = {
  type: 'ready'
}
self.postMessage(data)