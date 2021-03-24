import type { DestroyDemo } from '../index'

const { box2D } = await import('../box2d')

export interface RampDemo {
  world: Box2D.b2World
  destroyDemo: DestroyDemo
}

export const makeRampDemo = (
  debugDraw: Box2D.b2Draw,
  boxCount: number
): RampDemo => {
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

  return {
    world,
    destroyDemo: () => {
      for (let body = world.GetBodyList(); getPointer(body) !== getPointer(NULL); body = body.GetNext()) {
        world.DestroyBody(body)
      }
      destroy(world)
    }
  }
}