import type { GetDrawBuffer, MainLoop } from './onContext'
import { onContext } from './onContext'
import type { FromMain, ReadyFromWorker } from '../protocol'
import { DrawBuffer, drawBuffer, flushDrawBuffer } from './debugDraw'
import { growableQuadIndexArray } from './growableTypedArray'

self.onmessageerror = (event: MessageEvent) =>
  console.error('onmessageerror', event)
self.onerror = (event: ErrorEvent) =>
  console.error('onerror', event)

const { makeWorld } = await import('./world')

const boxCount = 2
const world = makeWorld(boxCount)
growableQuadIndexArray.ensureLength(boxCount)

const mainLoop: MainLoop = (intervalMs: number): void =>
  world.Step(intervalMs / 1000, 1, 1, 1)

const getDrawBuffer: GetDrawBuffer = (): DrawBuffer => {
  world.DebugDraw()
  return drawBuffer
}

self.onmessage = ({ data }: MessageEvent<FromMain>) => {
  if (data.type === 'offscreenCanvas') {
    const gl: WebGL2RenderingContext | null = data.offscreenCanvas.getContext('webgl2')
    if (gl === null) {
      throw new Error('Failed to create WebGL2 rendering context')
    }
    onContext(
      gl,
      mainLoop,
      getDrawBuffer,
      flushDrawBuffer,
      30
    )
  }
}

const data: ReadyFromWorker = {
  type: 'ready'
}
self.postMessage(data)