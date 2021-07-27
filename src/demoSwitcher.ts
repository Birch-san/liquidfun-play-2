import type { mat3 } from 'gl-matrix'
import type { MainLoop } from './loop'
import type { MutateMatrix, GetDrawBuffer, GetPixelsPerMeter } from './onContext'
import type { DrawBuffer } from './debugDraw'
import { debugDraw, drawBuffer, flushDrawBuffer } from './debugDraw'
import type { DestroyDemo, EventHandlers, WorldStep, WaveMachineGravity } from './demo'
import {
  Demo,
  makeRampDemo,
  makeGravityDemo,
  makeWaveMachineDemo
} from './demo'

type ClearCanvas = () => void

let world: Box2D.b2World | undefined
let destroyDemo: DestroyDemo | undefined
let worldStep: WorldStep | undefined
let clearCanvas: ClearCanvas | undefined
let matrixMutator: MutateMatrix | undefined
let matrixMutatorMetresToCanvas: MutateMatrix | undefined
let getPixelsPerMeter: GetPixelsPerMeter | undefined
export let eventHandlers: EventHandlers | undefined

export interface DemoParams {
  waveMachineGravity: WaveMachineGravity
  dragEnabled: boolean
}

export const switchDemo = (proposedDemo: Demo, { dragEnabled, waveMachineGravity }: DemoParams): void => {
  destroyDemo?.()
  destroyDemo = undefined
  worldStep = undefined
  matrixMutator = undefined
  matrixMutatorMetresToCanvas = undefined
  getPixelsPerMeter = undefined
  clearCanvas?.()
  switch (proposedDemo) {
    case Demo.None:
      world = undefined
      break
    case Demo.Ramp: {
      const boxCount = 100;
      ({ world, destroyDemo, worldStep, matrixMutator, getPixelsPerMeter, eventHandlers } = makeRampDemo(debugDraw, boxCount))
      break
    }
    case Demo.Gravity: {
      ({ world, destroyDemo, worldStep, matrixMutator, matrixMutatorMetresToCanvas, getPixelsPerMeter, eventHandlers } = makeGravityDemo(debugDraw, dragEnabled))
      break
    }
    case Demo.WaveMachine: {
      ({ world, destroyDemo, worldStep, matrixMutator, getPixelsPerMeter, eventHandlers } = makeWaveMachineDemo(debugDraw, waveMachineGravity))
      break
    }
    default:
      throw new Error(`Unsupported demo type '${proposedDemo as string}'`)
  }
}

export const mainLoop: MainLoop = (intervalMs: number): void =>
  worldStep?.(intervalMs)

export const getDrawBuffer: GetDrawBuffer = (): DrawBuffer => {
  world?.DebugDraw()
  return drawBuffer
}

export const mutateMatrix: MutateMatrix = (out: mat3, canvasWidth: number, canvasHeight: number): void =>
  matrixMutator?.(out, canvasWidth, canvasHeight)

export const mutateMatrixMetresToCanvas: MutateMatrix = (out: mat3, canvasWidth: number, canvasHeight: number): void =>
  matrixMutatorMetresToCanvas?.(out, canvasWidth, canvasHeight)

export const pixelsPerMeterGetter: GetPixelsPerMeter = (): number =>
  getPixelsPerMeter?.() ?? 32

export const setClearCanvas = (proposed: ClearCanvas): void => {
  clearCanvas = proposed
}

export { clearCanvas, flushDrawBuffer }