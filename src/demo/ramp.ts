import type { DemoResources } from './index'
import { mat3 } from 'gl-matrix'
import { LeakMitigator } from '../box2d'

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
    getPointer,
    NULL
  } = box2D

  const { freeLeaked, recordLeak } = new LeakMitigator()
  const gravity = new b2Vec2(0, 10)
  const world = new b2World(gravity)
  destroy(gravity)

  world.SetDebugDraw(debugDraw)

  const from = new b2Vec2(3, 4)
  const to = new b2Vec2(6, 7)
  const bd_ground = new b2BodyDef()
  const ground = recordLeak(world.CreateBody(bd_ground))
  // ramp which boxes fall onto initially
  {
    const shape = new b2EdgeShape()
    shape.SetTwoSided(from, to)
    recordLeak(ground.CreateFixture(shape, 0))
    destroy(shape)
  }
  // floor which boxes rest on
  {
    from.Set(3, 18)
    to.Set(22, 18)
    const shape = new b2EdgeShape()
    shape.SetTwoSided(from, to)
    recordLeak(ground.CreateFixture(shape, 0))
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
    const body = recordLeak(world.CreateBody(bd))
    recordLeak(body.CreateFixture(square, 1))
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
      for (let body = recordLeak(world.GetBodyList()); getPointer(body) !== getPointer(NULL); body = recordLeak(body.GetNext())) {
        world.DestroyBody(body)
      }
      destroy(world)
      freeLeaked()
    }
  }
}