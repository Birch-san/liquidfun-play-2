import type { ClickPos, DemoResources } from './index'
import { vec2, mat3 } from 'gl-matrix'
import { dontDestroy } from '../debugDraw'

const { box2D } = await import('../box2d')

export const makeWaveMachineDemo = (
  debugDraw: Box2D.b2Draw,
  frameLimit: number
): DemoResources => {
  const {
    b2_dynamicBody,
    b2AABB,
    b2BodyDef,
    b2Vec2,
    b2ParticleGroupDef,
    b2ParticleSystem,
    b2ParticleSystemDef,
    b2PolygonShape,
    b2RevoluteJoint,
    b2RevoluteJointDef,
    b2World,
    JSQueryCallback,
    castObject,
    destroy,
    getCache,
    getPointer,
    wrapPointer,
    HEAPF32,
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

  const impulse = new b2Vec2(0.25, 0)

  let mouseIsDown = false
  const mousePos = new b2Vec2(0, 0)
  const lowerBound = new b2Vec2(0, 0)
  const upperBound = new b2Vec2(0, 0)
  const aabb = new b2AABB()
  const queryCallback: Box2D.JSQueryCallback = Object.assign<
  Box2D.JSQueryCallback,
  Partial<Box2D.JSQueryCallback>
  >(new JSQueryCallback(), {
    ReportParticle (particleSystem_p: number, index: number): boolean {
      const particleSystem: Box2D.b2ParticleSystem = wrapPointer(particleSystem_p, b2ParticleSystem)
      const position_p = getPointer(particleSystem.GetPositionBuffer()) + index * 8
      const pos_x = HEAPF32[position_p >> 2]
      const pos_y = HEAPF32[position_p + 4 >> 2]
      impulse.Set(pos_x - mousePos.x, pos_y - mousePos.y)
      const lengthSquared = impulse.LengthSquared()
      const magnitude = Math.min(1 / lengthSquared, 0.25)
      impulse.Normalize()
      impulse.Set(impulse.x * magnitude, impulse.y * magnitude)
      particleSystem.ParticleApplyLinearImpulse(index, impulse)
      return true
    },
    ReportFixture: (_fixture_p: number) => false,
    ShouldQueryParticleSystem: (_particleSystem_p: number) => true
  })

  const updateMousePos = ({ x, y }: ClickPos): void => {
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
      mousePos.Set(x, y)
      const d = 0.02
      lowerBound.Set(x - d, y - d)
      upperBound.Set(x + d, y + d)
      aabb.set_lowerBound(lowerBound)
      aabb.set_upperBound(upperBound)
    }
  }

  return {
    world,
    worldStep: (intervalMs: number): void => {
      // 3 particle iterations seems to be enough to simulate a 60th of a second
      const particleIterations: number = Math.ceil(intervalMs / 3)
      const intervalSecs = intervalMs / 1000
      timeElapsedSecs += intervalSecs
      joint.SetMotorSpeed(0.05 * Math.cos(timeElapsedSecs) * Math.PI)
      if (mouseIsDown) {
        world.QueryAABB(queryCallback, aabb)
      }
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
      destroy(mousePos)
      destroy(queryCallback)
      destroy(lowerBound)
      destroy(upperBound)
      destroy(aabb)
      destroy(impulse)
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
        'b2Fixture',
        'b2Joint',
        'b2ParticleGroup',
        'b2ParticleSystem',
        'b2RevoluteJoint',
        'b2Vec2'
      ] as const) {
        const b2Class = box2D[b2ClassName]
        const cache = getCache(b2Class)
        for (const [pointer, instance] of Object.entries(cache)) {
          if (b2Class === b2Vec2) {
            // debugDraw.ts allocates a b2Vec2 which we should be careful not to destroy.
            if (dontDestroy.has(instance as Box2D.b2Vec2)) {
              continue
            }
          }
          console.log('freeing cache reference', b2ClassName, instance)
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
          delete cache[Number(pointer)]
        }
      }
    },
    eventHandlers: {
      onMouseDown: (clickPos: ClickPos): void => {
        mouseIsDown = true
        updateMousePos(clickPos)
      },
      onMouseUp: (): void => {
        mouseIsDown = false
      },
      onMouseMove: (clickPos: ClickPos): void => {
        updateMousePos(clickPos)
      }
    }
  }
}