import type { DemoResources } from './index'
import { mat3 } from 'gl-matrix'

const { box2D } = await import('../box2d')

type Destroy = () => void

export const makeWaveMachineDemo = (
  debugDraw: Box2D.b2Draw,
  frameLimit: number
): DemoResources => {
  const {
    b2_dynamicBody,
    b2BodyDef,
    b2FixtureDef,
    b2Vec2,
    b2ParticleGroupDef,
    b2ParticleSystemDef,
    b2PolygonShape,
    b2RevoluteJoint,
    b2RevoluteJointDef,
    b2World,
    castObject,
    destroy,
    getPointer,
    NULL
  } = box2D

  const gravity = new b2Vec2(0, 10)
  const world = new b2World(gravity)
  destroy(gravity)

  world.SetDebugDraw(debugDraw)

  const bd = new b2BodyDef()
  const ground: Box2D.b2Body = world.CreateBody(bd)

  bd.type = b2_dynamicBody
  bd.allowSleep = false
  bd.position.Set(0, 1)
  const body: Box2D.b2Body = world.CreateBody(bd)
  destroy(bd)

  const temp = new b2Vec2(0, 0)
  const shape = new b2PolygonShape()

  for (const [hx, hy, x, y] of [
    [0.05, 1, 2, 0],
    [0.05, 1, -2, 0],
    [2, 0.05, 0, 1],
    [2, 0.05, 0, -1]
  ]) {
    temp.Set(x, y)
    shape.SetAsBox(hx, hy, temp, 0)
    body.CreateFixture(shape, 5)
  }

  const jd = new b2RevoluteJointDef()
  jd.motorSpeed = 0.05 * Math.PI
  jd.maxMotorTorque = 1e7
  jd.enableMotor = true
  temp.Set(0, 1)
  jd.Initialize(ground, body, temp)
  const joint: Box2D.b2RevoluteJoint = castObject(world.CreateJoint(jd), b2RevoluteJoint)
  destroy(jd)

  const psd = new b2ParticleSystemDef()
  psd.radius = 0.025
  psd.dampingStrength = 0.2

  const particleSystem: Box2D.b2ParticleSystem = world.CreateParticleSystem(psd)
  destroy(psd)

  temp.Set(0, 1)
  shape.SetAsBox(0.9, 0.9, temp, 0)
  const particleGroupDef = new b2ParticleGroupDef()
  particleGroupDef.shape = shape
  particleSystem.CreateParticleGroup(particleGroupDef)
  destroy(particleGroupDef)
  destroy(shape)
  destroy(temp)

  const particleIterations: number = world.CalculateReasonableParticleIterations(1 / frameLimit)

  let timeElapsedSecs = 0

  const pixelsPerMeter = 160
  const translation = new Float32Array([0, 0.5])
  const scaler = new Float32Array([1, 1])

  return {
    world,
    worldStep: (intervalMs: number): void => {
      const intervalSecs = intervalMs / 1000
      timeElapsedSecs += intervalSecs
      joint.SetMotorSpeed(0.05 * Math.cos(timeElapsedSecs) * Math.PI)
      world.Step(intervalSecs, 1, 1, particleIterations)
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
      for (let body = world.GetBodyList(); getPointer(body) !== getPointer(NULL); body = body.GetNext()) {
        world.DestroyBody(body)
      }
      for (let joint = world.GetJointList(); getPointer(joint) !== getPointer(NULL); joint = joint.GetNext()) {
        world.DestroyJoint(joint)
      }
      world.DestroyParticleSystem(particleSystem)
      // destroyS1()
      // destroyS2()
      // destroyS3()
      // destroyS4()
      // destroyBox()
      destroy(world)
    }
  }
}