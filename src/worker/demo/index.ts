export type DestroyDemo = () => void

export interface DemoResources {
  world: Box2D.b2World
  destroyDemo: DestroyDemo
}