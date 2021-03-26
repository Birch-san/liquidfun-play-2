import { GetCamera } from '../onContext'

export type DestroyDemo = () => void
export type WorldStep = (intervalMs: number) => void

export interface DemoResources {
  world: Box2D.b2World
  worldStep: WorldStep
  destroyDemo: DestroyDemo
  getCamera: GetCamera
}