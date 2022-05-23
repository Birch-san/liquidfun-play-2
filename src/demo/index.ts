import type { GetPixelsPerMeter, MutateMatrix } from '../onContext'
import { makeRampDemo } from './ramp'
import { makeRamp2Demo } from './ramp2'
import { makeGravityDemo } from './gravity'
import { makeWaveMachineDemo, WaveMachineGravity } from './waveMachine'
export {
  makeRampDemo,
  makeRamp2Demo,
  makeGravityDemo,
  makeWaveMachineDemo,
  WaveMachineGravity
}

export enum Demo {
  Ramp = 'Ramp',
  Ramp2 = 'Ramp2',
  Gravity = 'Gravity',
  WaveMachine = 'WaveMachine',
  None = 'None'
}

export type DestroyDemo = () => void
export type WorldStep = (intervalMs: number) => void

// mouse coordinates within bounding rect of canvas
export interface ClickPos {
  // physical distance in pixels from left edge of canvas
  // clientX - left
  x: number
  // physical distance in pixels from top edge of canvas
  // clientY - top
  y: number
}
export type OnMouseDown = (pos: ClickPos) => void
export type OnMouseMove = (pos: ClickPos) => void
export type OnMouseUp = () => void

export interface EventHandlers {
  onMouseDown?: OnMouseDown
  onMouseMove?: OnMouseMove
  onMouseUp?: OnMouseUp
}

export interface DemoResources {
  world: Box2D.b2World
  worldStep: WorldStep
  destroyDemo: DestroyDemo
  matrixMutator: MutateMatrix
  matrixMutatorMetresToCanvas?: MutateMatrix
  getPixelsPerMeter: GetPixelsPerMeter
  eventHandlers?: EventHandlers
}