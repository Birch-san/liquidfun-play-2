import type { GetDrawBuffer, FlushDrawBuffer, MainLoop } from './onContext'
import { onContext } from './onContext'
import type { FromMain, ReadyFromWorker } from '../protocol'
import type { DebugDrawBuffer } from './debugDraw'
import { debugDrawBuffer, flushDebugDrawBuffer } from './debugDraw'

self.onmessageerror = (event: MessageEvent) =>
  console.error('onmessageerror', event)
self.onerror = (event: ErrorEvent) =>
  console.error('onerror', event)

const { box2D } = await import('./box2d')
const { debugDraw } = await import('./debugDraw')

const {
  b2_dynamicBody,
  b2BodyDef,
  b2EdgeShape,
  b2Vec2,
  b2PolygonShape,
  b2World,
  destroy
} = box2D

const gravity = new b2Vec2(0, 10)
const world = new b2World(gravity)
destroy(gravity)

world.SetDebugDraw(debugDraw)

{
  const from = new b2Vec2(3, 4)
  const to = new b2Vec2(6, 7)
  const bd_ground = new b2BodyDef()
  const ground = world.CreateBody(bd_ground)
  // ramp which boxes fall onto initially
  {
    const shape = new b2EdgeShape()
    shape.SetTwoSided(from, to)
    ground.CreateFixture(shape, 0)
  }
  // floor which boxes rest on
  {
    from.Set(3, 18)
    to.Set(22, 18)
    const shape = new b2EdgeShape()
    shape.SetTwoSided(from, to)
    ground.CreateFixture(shape, 0)
  }
  destroy(bd_ground)
  destroy(from)
  destroy(to)
}

{
  const sideLengthMetres = 1
  const square = new b2PolygonShape()
  square.SetAsBox(sideLengthMetres / 2, sideLengthMetres / 2)

  const zero = new b2Vec2(0, 0)
  const temp = new b2Vec2(0, 0)

  const initPosition = (body: Box2D.b2Body, index: number): void => {
    temp.Set(4 + sideLengthMetres * (Math.random() - 0.5), -sideLengthMetres * index)
    body.SetTransform(temp, 0)
    body.SetLinearVelocity(zero)
    body.SetAwake(true)
    body.SetEnabled(true)
  }

  const bd = new b2BodyDef()
  bd.set_type(b2_dynamicBody)
  bd.set_position(zero)

  // make falling boxes
  const boxCount = 10
  for (let i = 0; i < boxCount; i++) {
    const body = world.CreateBody(bd)
    body.CreateFixture(square, 1)
    initPosition(body, i)
  }

  destroy(bd)
  destroy(zero)
  destroy(temp)
}

const mainLoop: MainLoop = (intervalMs: number): void =>
  world.Step(intervalMs / 1000, 1, 1, 1)

const getDrawBuffer: GetDrawBuffer = (): DebugDrawBuffer => {
  world.DebugDraw()
  return debugDrawBuffer
}
const flushDrawBuffer: FlushDrawBuffer = flushDebugDrawBuffer

self.onmessage = ({ data }: MessageEvent<FromMain>) => {
  if (data.type === 'offscreenCanvas') {
    const gl: WebGL2RenderingContext | null = data.offscreenCanvas.getContext('webgl2')
    if (gl === null) {
      throw new Error('Failed to create WebGL2 rendering context')
    }
    onContext(
      gl,
      mainLoop,
      getDrawBuffer,
      flushDrawBuffer
    )
  }
}

const data: ReadyFromWorker = {
  type: 'ready'
}
self.postMessage(data)