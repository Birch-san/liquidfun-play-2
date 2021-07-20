import type { ClickPos, DemoResources } from './index'
import { vec2, mat3 } from 'gl-matrix'
// import type { MutateMatrix } from './onContext'

const { box2D } = await import('../box2d')

export const makeWaveMachineDemo = (
  debugDraw: Box2D.b2Draw,
  frameLimit: number
): DemoResources => {
  const {
    b2_dynamicBody,
    b2BodyDef,
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

  // {
  //   const { b2EdgeShape } = box2D
  //   const sideLen = 2
  //   const from = new b2Vec2(0, 0)
  //   const to = new b2Vec2(sideLen, 0)
  //   const bd_ground = new b2BodyDef()
  //   const ground = world.CreateBody(bd_ground)
  //   const shape = new b2EdgeShape()
  //   shape.SetTwoSided(from, to)
  //   ground.CreateFixture(shape, 0)
  //   // from.Set(3, 18)
  //   to.Set(0, sideLen)
  //   shape.SetTwoSided(from, to)
  //   ground.CreateFixture(shape, 0)
  //   destroy(shape)
  //   destroy(bd_ground)
  //   destroy(from)
  //   destroy(to)
  // }

  const secsPerFrame = 1 / frameLimit
  // const particleIterations: number = world.CalculateReasonableParticleIterations(secsPerFrame)

  let timeElapsedSecs = 0

  const pixelsPerMeter = 160

  const cameraMetres = {
    pos: vec2.fromValues(2.5, 1.25),
    negPos: vec2.create()
  } as const
  const { negate } = vec2
  const { pos, negPos } = cameraMetres
  negate(negPos, pos)

  const metresToClip = {
    // without translation: (0,0) metres ends up in center of canvas
    translateOriginToTopLeft: vec2.fromValues(-1, 1),
    scaler: vec2.create()
  } as const

  const pixelsToMetres = {
    scalePixelsToMetres: vec2.fromValues(1 / pixelsPerMeter, 1 / pixelsPerMeter),
    coord: vec2.create(),
    mat: mat3.create()
  } as const

  return {
    world,
    worldStep: (intervalMs: number): void => {
      // 3 particle iterations seems to be enough to simulate a 60th of a second
      const particleIterations: number = Math.ceil(intervalMs / 3)
      const intervalSecs = intervalMs / 1000
      timeElapsedSecs += intervalSecs
      joint.SetMotorSpeed(0.05 * Math.cos(timeElapsedSecs) * Math.PI)
      world.Step(intervalSecs, 1, 1, particleIterations)
    },
    getPixelsPerMeter: () => pixelsPerMeter,
    matrixMutator: (mat: mat3, canvasWidth: number, canvasHeight: number): void => {
      const { pos } = cameraMetres
      const { scaler, translateOriginToTopLeft } = metresToClip
      const { translate, scale } = mat3
      const { set } = vec2
      translate(mat, mat, translateOriginToTopLeft)
      set(
        scaler,
        1 / (canvasWidth / 2 / pixelsPerMeter),
        -1 / (canvasHeight / 2 / pixelsPerMeter)
      )
      scale(mat, mat, scaler)
      translate(mat, mat, pos)
    },
    destroyDemo: (): void => {
      for (let body = world.GetBodyList(); getPointer(body) !== getPointer(NULL); body = body.GetNext()) {
        world.DestroyBody(body)
      }
      for (let joint = world.GetJointList(); getPointer(joint) !== getPointer(NULL); joint = joint.GetNext()) {
        world.DestroyJoint(joint)
      }
      world.DestroyParticleSystem(particleSystem)
      destroy(world)
    },
    eventHandlers: {
      onMouseDown: ({ x, y }: ClickPos): void => {
        const { negPos } = cameraMetres
        const { mat, scalePixelsToMetres, coord } = pixelsToMetres
        const { identity, scale, translate } = mat3
        const { set, transformMat3 } = vec2
        identity(mat)
        translate(mat, mat, negPos)
        scale(mat, mat, scalePixelsToMetres)
        set(coord, x, y)
        transformMat3(coord, coord, mat)
        {
          const [x, y] = coord
          console.log(x, y)
        }
      }
    }
  }
}