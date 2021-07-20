import type { GetPixelsPerMeter, MutateMatrix } from '../onContext'

export type DestroyDemo = () => void
export type WorldStep = (intervalMs: number) => void

// click coordinates within bounding rect of canvas
export interface ClickPos {
  // physical distance in pixels from left edge of canvas
  // clientX - left
  x: number
  // physical distance in pixels from top edge of canvas
  // clientY - top
  y: number
}
export type OnMouseDown = (pos: ClickPos) => void

export interface EventHandlers {
  onMouseDown?: OnMouseDown
}

export interface DemoResources {
  world: Box2D.b2World
  worldStep: WorldStep
  destroyDemo: DestroyDemo
  matrixMutator: MutateMatrix
  getPixelsPerMeter: GetPixelsPerMeter
  eventHandlers?: EventHandlers
}