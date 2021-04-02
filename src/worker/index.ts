import { onContext } from '../common/onContext'
import type { FromMain, ReadyFromWorker } from '../common/protocol'
import {
  shouldRun,
  mainLoop,
  getDrawBuffer,
  flushDrawBuffer,
  mutateMatrix,
  pixelsPerMeterGetter,
  switchDemo,
  setClearCanvas
} from '../common/demoSwitcher'

self.onmessageerror = (event: MessageEvent) =>
  console.error('onmessageerror', event)
self.onerror = (event: ErrorEvent) =>
  console.error('onerror', event)

self.onmessage = ({ data }: MessageEvent<FromMain>) => {
  switch (data.type) {
    case 'offscreenCanvas': {
      const gl: WebGL2RenderingContext | null = data.offscreenCanvas.getContext('webgl2')
      if (gl === null) {
        throw new Error('Failed to create WebGL2 rendering context')
      }
      setClearCanvas(() => gl.clear(gl.COLOR_BUFFER_BIT))
      onContext(
        gl,
        shouldRun,
        mainLoop,
        getDrawBuffer,
        flushDrawBuffer,
        mutateMatrix,
        pixelsPerMeterGetter
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