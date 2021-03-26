import type { DemoResources } from './index'

const { box2D } = await import('../box2d')

type Destroy = () => void

export const makeWaveMachineDemo = (
  debugDraw: Box2D.b2Draw
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
  const makeShape = (
    hx: number,
    hy: number,
    x: number,
    y: number
  ): [Box2D.b2PolygonShape, Destroy] => {
    temp.Set(x, y)
    const shape = new b2PolygonShape()
    shape.SetAsBox(hx, hy, temp, 0)
    return [shape, () => destroy(shape)]
  }

  const [s1, destroyS1] = makeShape(0.05, 1, 2, 0)
  const [s2, destroyS2] = makeShape(0.05, 1, -2, 0)
  const [s3, destroyS3] = makeShape(2, 0.05, 0, 1)
  const [s4, destroyS4] = makeShape(2, 0.05, 0, -1)

  const fd = new b2FixtureDef()
  fd.density = 5

  const makeFixture = (shape: Box2D.b2Shape): Box2D.b2Fixture => {
    fd.shape = shape
    return body.CreateFixture(fd)
  }

  makeFixture(s1)
  makeFixture(s2)
  makeFixture(s3)
  makeFixture(s4)

  destroy(fd)

  const jd = new b2RevoluteJointDef()
  jd.motorSpeed = 0.05 * Math.PI
  jd.maxMotorTorque = 1e7
  jd.enableMotor = true
  temp.Set(0, 1)
  jd.Initialize(ground, body, temp)
  const joint: Box2D.b2RevoluteJoint = castObject(world.CreateJoint(jd), b2RevoluteJoint)
  destroy(jd)

  const [box, destroyBox] = makeShape(0.9, 0.9, 0, 1)
  destroy(temp)

  const psd = new b2ParticleSystemDef()
  psd.radius = 0.025
  psd.dampingStrength = 0.2

  const particleSystem: Box2D.b2ParticleSystem = world.CreateParticleSystem(psd)
  destroy(psd)

  const particleGroupDef = new b2ParticleGroupDef()
  particleGroupDef.shape = box
  particleSystem.CreateParticleGroup(particleGroupDef)
  destroy(particleGroupDef)

  let timeElapsedSecs = 0

  return {
    world,
    worldStep: (intervalMs: number): void => {
      const intervalSecs = intervalMs / 1000
      timeElapsedSecs += intervalSecs
      joint.SetMotorSpeed(0.05 * Math.cos(timeElapsedSecs) * Math.PI)
      world.Step(intervalSecs, 1, 1, 1)
    },
    destroyDemo: (): void => {
      for (let body = world.GetBodyList(); getPointer(body) !== getPointer(NULL); body = body.GetNext()) {
        world.DestroyBody(body)
      }
      for (let joint = world.GetJointList(); getPointer(joint) !== getPointer(NULL); joint = joint.GetNext()) {
        world.DestroyJoint(joint)
      }
      world.DestroyParticleSystem(particleSystem)
      destroyS1()
      destroyS2()
      destroyS3()
      destroyS4()
      destroyBox()
      destroy(world)
    }
  }
}