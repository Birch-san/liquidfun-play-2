import type { ClickPos, DemoResources } from './index'
import { vec2, mat3 } from 'gl-matrix'
import { LeakMitigator } from '../box2d'
import { assert } from '../assert'

const { box2D } = await import('../box2d')

export const makeGravityDemo = (
  debugDraw: Box2D.b2Draw,
  dragEnabled: boolean
): DemoResources => {
  const {
    b2_dynamicBody,
    b2BodyDef,
    b2CircleShape,
    b2Vec2,
    b2LinearStiffness,
    b2MouseJoint,
    b2MouseJointDef,
    b2ParticleGroupDef,
    b2ParticleSystemDef,
    b2PolygonShape,
    b2World,
    castObject,
    destroy,
    getPointer,
    _malloc,
    _free,
    HEAPF32,
    NULL
  } = box2D

  const { freeLeaked, recordLeak } = new LeakMitigator()
  const gravity = new b2Vec2(0, 0)
  const world = new b2World(gravity)
  destroy(gravity)

  world.SetDebugDraw(debugDraw)

  const particleRadiusNominal = 0.025
  const psd = new b2ParticleSystemDef()
  // psd.maxCount = 1
  psd.radius = particleRadiusNominal
  psd.dampingStrength = 0.2

  const particleSystem: Box2D.b2ParticleSystem = recordLeak(world.CreateParticleSystem(psd))
  destroy(psd)

  const temp = new b2Vec2(0, 0)
  const shape = new b2PolygonShape()
  temp.Set(0, 1)
  shape.SetAsBox(0.9, 0.9, temp, 0)
  const particleGroupDef = new b2ParticleGroupDef()
  particleGroupDef.shape = shape
  recordLeak(particleSystem.CreateParticleGroup(particleGroupDef))
  destroy(particleGroupDef)
  destroy(shape)

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

  const metresToPixels = {
    scaleMetresToPixelsAndFlipY: vec2.fromValues(pixelsPerMeter, -pixelsPerMeter),
    coord: vec2.create(),
    mat: mat3.create(),
    translateOriginBottomToTop: vec2.create()
  } as const

  const mousePos = new b2Vec2(0, 0)

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
      // console.log(x, y)
      mousePos.Set(x, y)
    }
    mouseJoint.SetTarget(mousePos)
  }

  const radiusToVolume = (radius: number): number =>
    4 / 3 * Math.PI * radius ** 3

  const ourEarthRadiusMetres = 0.8
  const actualEarthRadiusMetres = 6371009
  const distScale = actualEarthRadiusMetres / ourEarthRadiusMetres
  const earthAtmosphereHeight = 150000
  interface CircleGravitySourceSpec {
    position: vec2
    radius: number
    atmosphereHeight: number
    densityCoeff?: number
    mobile?: boolean
  }
  interface CircleGravitySource {
    position: vec2
    radius: number
    force: vec2
    mass3D: number
    atmosphereHeightCoeff: number
    body: Box2D.b2Body
    fixture: Box2D.b2Fixture
    mobile: boolean
  }
  const circleGravitySourceSpecs: CircleGravitySourceSpec[] = [{
    position: vec2.fromValues(1, 1.5),
    radius: ourEarthRadiusMetres,
    atmosphereHeight: 0.8
  }, {
    position: vec2.fromValues(-1, 0),
    radius: 0.7,
    atmosphereHeight: 0.7
  }, {
    radius: 0.2,
    position: vec2.fromValues(-1, -1),
    atmosphereHeight: 0.2,
    densityCoeff: 7,
    mobile: true
  }]
  // mean density in kg/m^3
  const earthDensity = 5515
  const bodyDef = new b2BodyDef()
  const mobileBodyDef = new b2BodyDef()
  mobileBodyDef.set_type(b2_dynamicBody)
  const circleShape = new b2CircleShape()
  const circleGravitySources: CircleGravitySource[] =
  circleGravitySourceSpecs.map(({ position, radius, atmosphereHeight, densityCoeff = 1, mobile = false }: CircleGravitySourceSpec): CircleGravitySource => {
    const body: Box2D.b2Body = recordLeak(world.CreateBody(mobile ? mobileBodyDef : bodyDef))
    circleShape.set_m_radius(radius)
    const [x, y] = position
    temp.Set(x, y)
    body.SetTransform(temp, 0)
    const fixture: Box2D.b2Fixture = recordLeak(body.CreateFixture(circleShape, densityCoeff))
    fixture.SetFriction(0.1)
    return {
      position,
      radius,
      force: vec2.create(),
      mass3D: radiusToVolume(radius) * earthDensity * densityCoeff,
      atmosphereHeightCoeff: atmosphereHeight * distScale / earthAtmosphereHeight,
      body,
      fixture,
      mobile
    }
  })
  destroy(bodyDef)
  destroy(mobileBodyDef)
  destroy(circleShape)

  const frequencyHz = 5
  const dampingRatio = 0.7
  const mobilePlanet: CircleGravitySource | undefined =
    circleGravitySources.find(({ mobile }: CircleGravitySource) => mobile)
  assert(mobilePlanet)
  const mouseJointBD = new b2BodyDef()
  const mouseBody: Box2D.b2Body = recordLeak(world.CreateBody(mouseJointBD))
  destroy(mouseJointBD)
  const mJD = new b2MouseJointDef()
  mJD.set_bodyA(mouseBody)
  mJD.set_bodyB(mobilePlanet.body)
  const [x, y] = mobilePlanet.position
  temp.Set(x, y)
  mJD.set_target(temp)
  mJD.set_maxForce(1000 * mobilePlanet.body.GetMass())
  mJD.set_collideConnected(true)
  const stiffnessDamping_p: number = _malloc(2 * Float32Array.BYTES_PER_ELEMENT)
  b2LinearStiffness(stiffnessDamping_p, stiffnessDamping_p + Float32Array.BYTES_PER_ELEMENT, frequencyHz, dampingRatio, mouseBody, mobilePlanet.body)
  const [stiffness, damping] = HEAPF32.subarray(stiffnessDamping_p >> 2)
  _free(stiffnessDamping_p)
  mJD.set_stiffness(stiffness)
  mJD.set_damping(damping)
  const mouseJoint: Box2D.b2MouseJoint = recordLeak(castObject(recordLeak(world.CreateJoint(mJD)), b2MouseJoint))
  destroy(mJD)
  // mobilePlanet.body.SetAwake(true)

  destroy(temp)

  const particlePos = vec2.create()
  const posDelta = vec2.create()
  const totalForce = vec2.create()
  const b2Force = new b2Vec2(0, 0)
  // kg/m^3
  const particleDensity3D = 997.048
  const particleMass3D = radiusToVolume(particleRadiusNominal * distScale) * particleDensity3D
  const gravitationalConstant = 6.674e-11

  const applyGravity = (): void => {
    const positionBuffer: Box2D.b2Vec2 = recordLeak(particleSystem.GetPositionBuffer())
    const { add, set, sub, sqrLen, len, normalize, scale } = vec2
    for (let i = 0; i < particleSystem.GetParticleCount(); i++) {
      // in some shaders we render the particles artifically bigger
      // if we wanted to calculate their masses based on their render size, we could use
      // the commented-out approach. but since the actual physics is based on their nominal radius,
      // it'd be unrealistic for our gravity to care about their rendered radius.
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
  const getAtmosphericDensity = (altitude: number): number => {
    if (altitude > earthAtmosphereHeight) return 0

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

  const particleVel = vec2.create()
  // based on Jon Renner's 'Air Resistance in Box2D'
  // https://ilearnsomethings.blogspot.com/2013/05/air-resistance-in-box2d.html
  const A = 1
  const Cd = 0.47 // 0.05 for a sleek object, 1.05 for a square, 0.47 for a circle

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
      circleGravitySources.reduce((totalForce: vec2, { position, force, radius, atmosphereHeightCoeff }: CircleGravitySource): vec2 => {
        set(force, 0, 0)
        sub(posDelta, position, particlePos)
        const altitude = len(posDelta) - radius
        // simulate a taller atmosphere than Earth's
        // since at the same scales, our particle's radius easily puts it above an Earth atmosphere
        const atmosphericDensity = getAtmosphericDensity(altitude * distScale / atmosphereHeightCoeff)

        const p = atmosphericDensity
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
      const particleIterations = dragEnabled ? 5 : 4
      const intervalSecs = intervalMs / 1000

      const { set } = vec2
      const { x, y }: Box2D.b2Vec2 = recordLeak(mobilePlanet.body.GetPosition())
      set(mobilePlanet.position, x, y)

      applyGravity()

      if (dragEnabled) {
        applyDrag()
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
    matrixMutatorMetresToCanvas: (mat: mat3, _canvasWidth: number, canvasHeight: number): void => {
      const { pos } = cameraMetres
      const { scaleMetresToPixelsAndFlipY, translateOriginBottomToTop } = metresToPixels
      const { identity, scale, translate } = mat3
      const { set } = vec2
      identity(mat)
      set(translateOriginBottomToTop, 0, canvasHeight)
      translate(mat, mat, translateOriginBottomToTop)
      scale(mat, mat, scaleMetresToPixelsAndFlipY)
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
      destroy(b2Force)
      freeLeaked()
    },
    eventHandlers: {
      onMouseMove: (clickPos: ClickPos): void => {
        updateMousePos(clickPos)
      }
    }
  }
}