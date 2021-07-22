import type { DemoResources } from './index'
import { mat3 } from 'gl-matrix'

const { box2D } = await import('../box2d')

export const makeRampDemo = (
  debugDraw: Box2D.b2Draw,
  boxCount: number
): DemoResources => {
  const {
    b2_dynamicBody,
    b2BodyDef,
    b2EdgeShape,
    b2Vec2,
    b2PolygonShape,
    b2World,
    destroy,
    getCache,
    getPointer,
    NULL
  } = box2D

  const gravity = new b2Vec2(0, 10)
  const world = new b2World(gravity)
  destroy(gravity)

  world.SetDebugDraw(debugDraw)

  const from = new b2Vec2(3, 4)
  const to = new b2Vec2(6, 7)
  const bd_ground = new b2BodyDef()
  const ground = world.CreateBody(bd_ground)
  // ramp which boxes fall onto initially
  {
    const shape = new b2EdgeShape()
    shape.SetTwoSided(from, to)
    ground.CreateFixture(shape, 0)
    destroy(shape)
  }
  // floor which boxes rest on
  {
    from.Set(3, 18)
    to.Set(22, 18)
    const shape = new b2EdgeShape()
    shape.SetTwoSided(from, to)
    ground.CreateFixture(shape, 0)
    destroy(shape)
  }
  destroy(bd_ground)
  destroy(from)
  destroy(to)

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
  for (let i = 0; i < boxCount; i++) {
    const body = world.CreateBody(bd)
    body.CreateFixture(square, 1)
    initPosition(body, i)
  }

  destroy(bd)
  destroy(zero)
  destroy(temp)
  destroy(square)

  const pixelsPerMeter = 32
  const translation = new Float32Array([-1, 1])
  const scaler = new Float32Array([1, 1])

  return {
    world,
    worldStep: (intervalMs: number): void =>
      world.Step(intervalMs / 1000, 1, 1),
    getPixelsPerMeter: () => pixelsPerMeter,
    matrixMutator: (mat: mat3, canvasWidth: number, canvasHeight: number): void => {
      const { translate, scale } = mat3
      translate(mat, mat, translation)
      scaler[0] = 1 / (canvasWidth / 2 / pixelsPerMeter)
      scaler[1] = -1 / (canvasHeight / 2 / pixelsPerMeter)
      scale(mat, mat, scaler)
    },
    destroyDemo: (): void => {
      for (let body = world.GetBodyList(); getPointer(body) !== getPointer(NULL); body = body.GetNext()) {
        world.DestroyBody(body)
      }
      destroy(world)
      // destroy() is necessary on any instance created via `new`.
      // destroy() = "invoke __destroy__ (free emscripten heap)" + free reference from JS cache
      // but there's another way to create instances: wrapPointer().
      // wrapPointer() creates (or retrieves from cache) instances _without_ malloc()ing
      // memory on Emscripten's heap.
      // we need to cleanup after wrapPointer(). destroy() is not necessary, but we do need
      // to free up the JS cache.
      // wrapPointer() may be called by us, or under-the-hood
      // (i.e. by any method which returns an instance).
      // iterate through all classes which we believe have had instances
      // created via an explicit or under-the-hood wrapPointer().
      // free those instances from their cache.
      for (const b2ClassName of [
        'b2Body',
        'b2Fixture'
      ] as const) {
        const b2Class = box2D[b2ClassName]
        const cache = getCache(b2Class)
        for (const pointer of Object.keys(cache)) {
          // console.info('freeing cache reference', b2ClassName)
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete cache[Number(pointer)]
        }
      }
    }
  }
}