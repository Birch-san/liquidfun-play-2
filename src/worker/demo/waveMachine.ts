import type { DemoResources } from './index'

const { box2D } = await import('../box2d')

export const makeWaveMachineDemo = (
  debugDraw: Box2D.b2Draw
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

  const gravity = new b2Vec2(0, 10)
  const world = new b2World(gravity)
  destroy(gravity)

  world.SetDebugDraw(debugDraw)

  return {
    world,
    destroyDemo: (): void => {
      for (let body = world.GetBodyList(); getPointer(body) !== getPointer(NULL); body = body.GetNext()) {
        world.DestroyBody(body)
      }
      destroy(world)
    }
  }
}