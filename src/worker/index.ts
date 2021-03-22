import type { GetDrawBuffer, FlushDrawBuffer, MainLoop } from './onContext'
import { onContext } from './onContext'
import type { FromMain, ReadyFromWorker } from '../protocol'
import type { DebugDrawBuffer } from './debugDraw'
import { debugDrawBuffer, flushDebugDrawBuffer } from './debugDraw'
import { allocQuads, releaseQuads } from './quadAllocator'
import { ensureQuadBufferFits } from './quadBufferAllocator'

self.onmessageerror = (event: MessageEvent) =>
  console.error('onmessageerror', event)
self.onerror = (event: ErrorEvent) =>
  console.error('onerror', event)

const { makeWorld } = await import('./world')

const boxCount = 2
const world = makeWorld(boxCount)
allocQuads(boxCount)
ensureQuadBufferFits(boxCount)

const mainLoop: MainLoop = (intervalMs: number): void =>
  world.Step(intervalMs / 1000, 1, 1, 1)

const getDrawBuffer: GetDrawBuffer = (): DebugDrawBuffer => {
  world.DebugDraw()
  return debugDrawBuffer
}
const flushDrawBuffer: FlushDrawBuffer = (): void => {
  flushDebugDrawBuffer()
  releaseQuads()
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
      flushDrawBuffer
    )
  }
}

const data: ReadyFromWorker = {
  type: 'ready'
}
self.postMessage(data)