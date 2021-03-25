import type { GetDrawBuffer, MainLoop, ShouldRun } from './onContext'
import { onContext } from './onContext'
import { Demo } from '../protocol'
import type { FromMain, ReadyFromWorker } from '../protocol'
import { DrawBuffer, drawBuffer, flushDrawBuffer } from './debugDraw'
import type { DestroyDemo } from './demo'

self.onmessageerror = (event: MessageEvent) =>
  console.error('onmessageerror', event)
self.onerror = (event: ErrorEvent) =>
  console.error('onerror', event)

let world: Box2D.b2World | undefined
let destroyDemo: DestroyDemo | undefined

const { debugDraw } = await import('./debugDraw')

const switchDemo = async (proposedDemo: Demo): Promise<void> => {
  switch (proposedDemo) {
    case Demo.None:
      destroyDemo?.()
      world = undefined
      break
    case Demo.Ramp: {
      const boxCount = 100
      const { makeRampDemo } = await import('./demo/ramp');
      ({ world, destroyDemo } = makeRampDemo(debugDraw, boxCount))
      break
    }
    case Demo.WaveMachine: {
      const { makeWaveMachineDemo } = await import('./demo/waveMachine');
      ({ world, destroyDemo } = makeWaveMachineDemo(debugDraw))
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
  world?.Step(intervalMs / 1000, 1, 1, 1)

const getDrawBuffer: GetDrawBuffer = (): DrawBuffer => {
  world?.DebugDraw()
  return drawBuffer
}

self.onmessage = ({ data }: MessageEvent<FromMain>) => {
  switch (data.type) {
    case 'offscreenCanvas': {
      const gl: WebGL2RenderingContext | null = data.offscreenCanvas.getContext('webgl2')
      if (gl === null) {
        throw new Error('Failed to create WebGL2 rendering context')
      }
      onContext(
        gl,
        shouldRun,
        mainLoop,
        getDrawBuffer,
        flushDrawBuffer
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