import type { GetDrawBuffer, FlushDrawBuffer, MainLoop } from './onContext'
import { onContext } from './onContext'
import type { FromMain, ReadyFromWorker } from '../protocol'
import type { DebugDrawBuffer } from './debugDraw'
import { debugDrawBuffer, flushDebugDrawBuffer } from './debugDraw'

self.onmessageerror = (event: MessageEvent) =>
  console.error('onmessageerror', event)
self.onerror = (event: ErrorEvent) =>
  console.error('onerror', event)

const { world } = await import('./world')

const mainLoop: MainLoop = (intervalMs: number): void =>
  world.Step(intervalMs / 1000, 1, 1, 1)

const getDrawBuffer: GetDrawBuffer = (): DebugDrawBuffer => {
  world.DebugDraw()
  return debugDrawBuffer
}
const flushDrawBuffer: FlushDrawBuffer = flushDebugDrawBuffer

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
      flushDrawBuffer
    )
  }
}

const data: ReadyFromWorker = {
  type: 'ready'
}
self.postMessage(data)