import type { MutateMatrix, GetDrawBuffer, MainLoop, ShouldRun } from './onContext'
import { onContext } from './onContext'
import { Demo } from '../protocol'
import type { FromMain, ReadyFromWorker } from '../protocol'
import { DrawBuffer, drawBuffer, flushDrawBuffer } from './debugDraw'
import type { DestroyDemo, WorldStep } from './demo'
import type { mat3 } from 'gl-matrix'

self.onmessageerror = (event: MessageEvent) =>
  console.error('onmessageerror', event)
self.onerror = (event: ErrorEvent) =>
  console.error('onerror', event)

type ClearCanvas = () => void

let world: Box2D.b2World | undefined
let destroyDemo: DestroyDemo | undefined
let worldStep: WorldStep | undefined
let clearCanvas: ClearCanvas | undefined
let matrixMutator: MutateMatrix | undefined

const { debugDraw } = await import('./debugDraw')

const switchDemo = async (proposedDemo: Demo): Promise<void> => {
  destroyDemo?.()
  destroyDemo = undefined
  worldStep = undefined
  matrixMutator = undefined
  clearCanvas?.()
  switch (proposedDemo) {
    case Demo.None:
      world = undefined
      break
    case Demo.Ramp: {
      const boxCount = 100
      const { makeRampDemo } = await import('./demo/ramp');
      ({ world, destroyDemo, worldStep, matrixMutator } = makeRampDemo(debugDraw, boxCount))
      break
    }
    case Demo.WaveMachine: {
      const { makeWaveMachineDemo } = await import('./demo/waveMachine');
      ({ world, destroyDemo, worldStep, matrixMutator } = makeWaveMachineDemo(debugDraw))
      break
    }
    default:
      throw new Error(`Unsupported demo type '${proposedDemo as string}'`)
  }
}

const frameLimit = 90
const minimumWaitMs = 1 / frameLimit * 1000
const shouldRun: ShouldRun = (intervalMs: number): boolean =>
  intervalMs > minimumWaitMs && world !== undefined

const mainLoop: MainLoop = (intervalMs: number): void =>
  worldStep?.(intervalMs)

const getDrawBuffer: GetDrawBuffer = (): DrawBuffer => {
  world?.DebugDraw()
  return drawBuffer
}

const mutateMatrix: MutateMatrix = (out: mat3, canvasWidth: number, canvasHeight: number): void =>
  matrixMutator?.(out, canvasWidth, canvasHeight)

self.onmessage = ({ data }: MessageEvent<FromMain>) => {
  switch (data.type) {
    case 'offscreenCanvas': {
      const gl: WebGL2RenderingContext | null = data.offscreenCanvas.getContext('webgl2')
      if (gl === null) {
        throw new Error('Failed to create WebGL2 rendering context')
      }
      clearCanvas = () => gl.clear(gl.COLOR_BUFFER_BIT)
      onContext(
        gl,
        shouldRun,
        mainLoop,
        getDrawBuffer,
        flushDrawBuffer,
        mutateMatrix
      )
      break
    }
    case 'switchDemo':
      void switchDemo(data.demo)
      break
  }
}

const data: ReadyFromWorker = {
  type: 'ready'
}
self.postMessage(data)