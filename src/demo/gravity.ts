import type { ClickPos, DemoResources } from './index'
import { randomRadiusArray } from '../growableTypedArray'
import { vec2, mat3 } from 'gl-matrix'
import { LeakMitigator } from '../box2d'

const { box2D } = await import('../box2d')

export const makeGravityDemo = (
  debugDraw: Box2D.b2Draw
): DemoResources => {
  const {
    b2_dynamicBody,
    b2AABB,
    b2BodyDef,
    b2CircleShape,
    b2Vec2,
    b2MassData,
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
    getPointer,
    HEAPF32,
    NULL
  } = box2D

  const { freeLeaked, recordLeak, safeWrapPointer } = new LeakMitigator()
  const gravity = new b2Vec2(0, 0)
  const world = new b2World(gravity)
  destroy(gravity)

  world.SetDebugDraw(debugDraw)

  // const bd = new b2BodyDef()
  // const ground: Box2D.b2Body = recordLeak(world.CreateBody(bd))

  // bd.type = b2_dynamicBody
  // bd.allowSleep = false
  // bd.position.Set(0, 1)
  // const body: Box2D.b2Body = recordLeak(world.CreateBody(bd))
  // destroy(bd)

  const temp = new b2Vec2(0, 0)
  const shape = new b2PolygonShape()

  // for (const [hx, hy, x, y] of [
  //   [0.05, 1, 2, 0],
  //   [0.05, 1, -2, 0],
  //   [2, 0.05, 0, 1],
  //   [2, 0.05, 0, -1]
  // ]) {
  //   temp.Set(x, y)
  //   shape.SetAsBox(hx, hy, temp, 0)
  //   recordLeak(body.CreateFixture(shape, 5))
  // }

  // const jd = new b2RevoluteJointDef()
  // jd.motorSpeed = 0.05 * Math.PI
  // jd.maxMotorTorque = 1e7
  // jd.enableMotor = true
  // temp.Set(0, 1)
  // jd.Initialize(ground, body, temp)
  // const jointAbstract: Box2D.b2Joint = recordLeak(world.CreateJoint(jd))
  // const joint: Box2D.b2RevoluteJoint = recordLeak(castObject(jointAbstract, b2RevoluteJoint))
  // destroy(jd)

  const particleRadiusNominal = 0.025
  const psd = new b2ParticleSystemDef()
  psd.maxCount = 50
  psd.radius = particleRadiusNominal
  psd.dampingStrength = 0.2

  const particleSystem: Box2D.b2ParticleSystem = recordLeak(world.CreateParticleSystem(psd))
  destroy(psd)

  temp.Set(0, 1)
  shape.SetAsBox(0.9, 0.9, temp, 0)
  const particleGroupDef = new b2ParticleGroupDef()
  particleGroupDef.shape = shape
  recordLeak(particleSystem.CreateParticleGroup(particleGroupDef))
  destroy(particleGroupDef)
  destroy(shape)

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
      const particleSystem: Box2D.b2ParticleSystem = safeWrapPointer(particleSystem_p, b2ParticleSystem)
      const positionBuffer: Box2D.b2Vec2 = recordLeak(particleSystem.GetPositionBuffer())
      const position_p = getPointer(positionBuffer) + index * 8
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

  const radiusToVolume = (radius: number): number =>
    4 / 3 * Math.PI * radius ** 3
  interface CircleGravitySourceSpec {
    position: vec2
    radius: number
  }
  interface CircleGravitySource extends CircleGravitySourceSpec {
    force: vec2
    mass3D: number
  }
  const circleGravitySourceSpecs: CircleGravitySourceSpec[] = [{
    position: vec2.fromValues(1, 1),
    radius: 0.5
  }, {
    position: vec2.fromValues(-1, 0.7),
    radius: 0.3
  }]
  // const density = 1
  // mean density in kg/m^3
  const earthDensity = 5515
  // const massData = new b2MassData()
  const bodyDef = new b2BodyDef()
  const circleShape = new b2CircleShape()
  const circleGravitySources: CircleGravitySource[] =
  circleGravitySourceSpecs.map(({ position, radius }: CircleGravitySourceSpec): CircleGravitySource => {
    const body: Box2D.b2Body = recordLeak(world.CreateBody(bodyDef))
    circleShape.set_m_radius(radius)
    // circleShape.ComputeMass(massData, density)
    const [x, y] = position
    temp.Set(x, y)
    body.SetTransform(temp, 0)
    const fixture: Box2D.b2Fixture = recordLeak(body.CreateFixture(circleShape, 0))
    fixture.SetFriction(0.1)
    return {
      position,
      radius,
      force: vec2.create(),
      mass3D: radiusToVolume(radius) * earthDensity
      // mass: massData.mass
    }
  })
  destroy(temp)
  // destroy(massData)
  destroy(bodyDef)
  destroy(circleShape)

  const earthRadiusMetres = 6371009
  const distScale = 6371009 / circleGravitySources[0].radius

  const particlePos = vec2.create()
  const posDelta = vec2.create()
  const totalForce = vec2.create()
  const b2Force = new b2Vec2(0, 0)
  // const particleMassNominal = 1
  // kg/m^3
  const particleDensity3D = 997.048
  const particleMass3D = radiusToVolume(particleRadiusNominal * distScale) * particleDensity3D
  const gravitationalConstant = 6.674e-11

  const applyGravity = (): void => {
    const positionBuffer: Box2D.b2Vec2 = recordLeak(particleSystem.GetPositionBuffer())
    const { add, set, sub, sqrLen, len, normalize, scale } = vec2
    for (let i = 0; i < particleSystem.GetParticleCount(); i++) {
      // const particleRadiusCoeff = randomRadiusArray.get(i)
      // const particleRadius = particleRadiusNominal * particleRadiusCoeff
      // const particleVolume = radiusToVolume(particleRadius)
      // const particleMass3D = particleDensity3D * particleVolume
      const position_p = getPointer(positionBuffer) + i * 8
      set(
        particlePos,
        HEAPF32[position_p >> 2],
        HEAPF32[position_p + 4 >> 2]
      )
      set(totalForce, 0, 0)
      circleGravitySources.reduce((totalForce: vec2, { position, mass3D, force }: CircleGravitySource): vec2 => {
        set(force, 0, 0)
        sub(posDelta, position, particlePos)
        scale(posDelta, posDelta, distScale)
        const distSquared = sqrLen(posDelta)
        const massProduct = particleMass3D * mass3D
        const forceMagnitude = (gravitationalConstant * massProduct) / distSquared
        normalize(force, posDelta)
        scale(force, force, forceMagnitude)
        add(totalForce, totalForce, force)
        return totalForce
      }, totalForce)
      const magnitude = Math.min(len(totalForce), 10)
      normalize(totalForce, totalForce)
      scale(totalForce, totalForce, magnitude)
      const [x, y] = totalForce
      b2Force.Set(x, y)
      particleSystem.ParticleApplyForce(i, b2Force)
    }
  }

  // Implementation ported from Zach Lynn's (MIT-licensed) SpaceSim
  // https://github.com/zlynn1990/SpaceSim/blob/master/src/SpaceSim/SolarSystem/Planets/Earth.cs#L54
  // Realistic density model based off https://www.grc.nasa.gov/www/k-12/rocket/atmos.html
  const atmosphereHeight = 150000
  const getAtmosphericDensity = (altitude: number): number => {
    if (altitude > atmosphereHeight) return 0

    let temperature: number | undefined
    let pressure: number | undefined

    if (altitude > 25000) {
      temperature = -131.21 + 0.00299 * altitude
      pressure = 2.448 * Math.pow((temperature + 273.1) / 216.6, -11.388)
    } else if (altitude > 11000) {
      temperature = -56.46
      pressure = 22.65 * Math.exp(1.73 - 0.000157 * altitude)
    } else {
      temperature = 15.04 - 0.00649 * altitude
      pressure = 101.29 * Math.pow((temperature + 273.1) / 288.08, 5.256)
    }

    return pressure / (0.2869 * (temperature + 273.1))
  }

  // space shuttle is 37m long, so radius of 18.5.
  // our particles have radius 0.025 (psd.radius).
  // so want to scale distances by 740x
  // or take Earth's atmosphere height (150000m)
  // and scale to our desired atmosphere height (0.5m)
  // so scale distances as such.
  const distanceScale = 150000 / 0.5

  const particleVel = vec2.create()
  // based on Jon Renner's 'Air Resistance in Box2D'
  // https://ilearnsomethings.blogspot.com/2013/05/air-resistance-in-box2d.html
  const A = 1
  const Cd = 0.05 // 1.05 for a square, 0.47 for a circle
  // const Cd = 0.47 // 1.05 for a square, 0.47 for a circle
  const applyDrag = (): void => {
    const positionBuffer: Box2D.b2Vec2 = recordLeak(particleSystem.GetPositionBuffer())
    const velocityBuffer: Box2D.b2Vec2 = recordLeak(particleSystem.GetVelocityBuffer())
    const { add, set, sub, sqrLen, len, normalize, scale } = vec2
    for (let i = 0; i < particleSystem.GetParticleCount(); i++) {
      const position_p = getPointer(positionBuffer) + i * 8
      const velocity_p = getPointer(velocityBuffer) + i * 8
      set(
        particlePos,
        HEAPF32[position_p >> 2],
        HEAPF32[position_p + 4 >> 2]
      )
      set(
        particleVel,
        HEAPF32[velocity_p >> 2],
        HEAPF32[velocity_p + 4 >> 2]
      )
      set(totalForce, 0, 0)
      circleGravitySources.reduce((totalForce: vec2, { position, force, radius }: CircleGravitySource): vec2 => {
        set(force, 0, 0)
        sub(posDelta, position, particlePos)
        const altitude = len(posDelta) - radius
        const atmosphericDensity = getAtmosphericDensity(altitude * distScale)

        const p = atmosphericDensity
        // const p = 1
        const v = sqrLen(particleVel) // speed squared
        const dragForce = 0.5 * p * v * Cd * A

        normalize(force, particleVel)
        scale(force, force, -dragForce)
        add(totalForce, totalForce, force)
        return totalForce
      }, totalForce)
      const magnitude = Math.min(len(totalForce), 10)
      normalize(totalForce, totalForce)
      scale(totalForce, totalForce, magnitude)
      const [x, y] = totalForce
      b2Force.Set(x, y)
      particleSystem.ParticleApplyForce(i, b2Force)
    }
  }

  return {
    world,
    worldStep: (intervalMs: number): void => {
      // 3 particle iterations seems to be enough to simulate a 60th of a second
      const particleIterations: number = Math.ceil(intervalMs / 3)
      const intervalSecs = intervalMs / 1000
      // timeElapsedSecs += intervalSecs
      // joint.SetMotorSpeed(0.05 * Math.cos(timeElapsedSecs) * Math.PI)
      if (mouseIsDown) {
        world.QueryAABB(queryCallback, aabb)
      }
      applyGravity()
      // applyDrag()
      // TODO: can we set position/velocity iterations to 0?
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
      for (let body = recordLeak(world.GetBodyList()); getPointer(body) !== getPointer(NULL); body = recordLeak(body.GetNext())) {
        world.DestroyBody(body)
      }
      for (let joint = recordLeak(world.GetJointList()); getPointer(joint) !== getPointer(NULL); joint = recordLeak(joint.GetNext())) {
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
      destroy(b2Force)
      freeLeaked()
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