import type { MainLoop } from './loop'
import type { MutateMatrix, GetDrawBuffer, GetPixelsPerMeter } from './onContext'
import { DrawBuffer, drawBuffer, flushDrawBuffer } from './debugDraw'
import type { DestroyDemo, WorldStep } from './demo'
import { Demo } from './protocol'
import type { mat3 } from 'gl-matrix'
import { frameLimit } from './loop'

type ClearCanvas = () => void

let world: Box2D.b2World | undefined
let destroyDemo: DestroyDemo | undefined
let worldStep: WorldStep | undefined
let clearCanvas: ClearCanvas | undefined
let matrixMutator: MutateMatrix | undefined
let getPixelsPerMeter: GetPixelsPerMeter | undefined

const { debugDraw } = await import('./debugDraw')

export const switchDemo = async (proposedDemo: Demo): Promise<void> => {
  destroyDemo?.()
  destroyDemo = undefined
  worldStep = undefined
  matrixMutator = undefined
  getPixelsPerMeter = undefined
  clearCanvas?.()
  switch (proposedDemo) {
    case Demo.None:
      world = undefined
      break
    case Demo.Ramp: {
      const boxCount = 100
      const { makeRampDemo } = await import('./demo/ramp');
      ({ world, destroyDemo, worldStep, matrixMutator, getPixelsPerMeter } = makeRampDemo(debugDraw, boxCount))
      break
    }
    case Demo.WaveMachine: {
      const { makeWaveMachineDemo } = await import('./demo/waveMachine');
      ({ world, destroyDemo, worldStep, matrixMutator, getPixelsPerMeter } = makeWaveMachineDemo(debugDraw, frameLimit))
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

export const pixelsPerMeterGetter: GetPixelsPerMeter = (): number =>
  getPixelsPerMeter?.() ?? 32

export const setClearCanvas = (proposed: ClearCanvas): void => {
  clearCanvas = proposed
}

export { clearCanvas, flushDrawBuffer }