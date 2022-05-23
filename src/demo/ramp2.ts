import type { DemoResources } from './index'
import { mat3 } from 'gl-matrix'
import { LeakMitigator } from '../box2d'

const { box2D } = await import('../box2d')

export const makeRamp2Demo = (
  debugDraw: Box2D.b2Draw,
  boxCount: number
): DemoResources => {
  const {
    b2_dynamicBody,
    b2_elasticParticle,
    b2_springParticle,
    b2_solidParticleGroup,
    b2BodyDef,
    b2EdgeShape,
    b2Vec2,
    b2ParticleGroupDef,
    b2ParticleSystemDef,
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

  const from = new b2Vec2(0, 0)
  const to = new b2Vec2(0, 0)
  const bd_ground = new b2BodyDef()
  const ground = recordLeak(world.CreateBody(bd_ground))
  // vertical barrier, left
  {
    from.Set(1, 1)
    to.Set(1, 21)
    const shape = new b2EdgeShape()
    shape.SetTwoSided(from, to)
    recordLeak(ground.CreateFixture(shape, 0))
    destroy(shape)
  }
  // ramp which boxes fall onto initially
  {
    from.Set(3, 4)
    to.Set(6, 7)
    const shape = new b2EdgeShape()
    shape.SetTwoSided(from, to)
    recordLeak(ground.CreateFixture(shape, 0))
    destroy(shape)
  }
  // floor which boxes rest on
  {
    from.Set(1, 21)
    to.Set(22, 21)
    const shape = new b2EdgeShape()
    shape.SetTwoSided(from, to)
    recordLeak(ground.CreateFixture(shape, 0))
    destroy(shape)
  }
  // vertical barrier, right
  {
    from.Set(22, 1)
    to.Set(22, 21)
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
  // destroy(temp)
  destroy(square)

  // particles
  const psd = new b2ParticleSystemDef()
  psd.radius = 0.25
  psd.dampingStrength = 0.2

  const particleSystem: Box2D.b2ParticleSystem = recordLeak(world.CreateParticleSystem(psd))
  destroy(psd)

  temp.Set(11, 0)
  const shape = new b2PolygonShape()
  shape.SetAsBox(5, 5, temp, -Math.PI/4)
  const particleGroupDef = new b2ParticleGroupDef()
  particleGroupDef.flags = b2_elasticParticle;
  particleGroupDef.groupFlags = b2_solidParticleGroup;
  particleGroupDef.shape = shape
  // particleGroupDef.stride = 0.25
  recordLeak(particleSystem.CreateParticleGroup(particleGroupDef))
  destroy(particleGroupDef)
  destroy(shape)
  destroy(temp)

  const pixelsPerMeter = 32
  const translation = new Float32Array([-1, 1])
  const scaler = new Float32Array([1, 1])

  return {
    world,
    worldStep: (intervalMs: number): void => {
      // 3 particle iterations seems to be enough to simulate a 60th of a second
      const particleIterations = 3
      world.Step(intervalMs / 1000, 1, 1, particleIterations)
    },
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
      world.DestroyParticleSystem(particleSystem)
      destroy(world)
      freeLeaked()
    }
  }
}