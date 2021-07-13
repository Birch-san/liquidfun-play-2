import type { Demo } from '../protocol'
import type { ChangeDemo, ExecutionStrategy, ExecutionStrategyStart } from './index'
import type { StopMainLoop } from '../onContext'
import { onContext } from '../onContext'
import {
  shouldRun,
  mainLoop,
  getDrawBuffer,
  flushDrawBuffer,
  mutateMatrix,
  pixelsPerMeterGetter,
  switchDemo,
  setClearCanvas
} from '../demoSwitcher'
import { getWebGLContext } from '../getWebGLContext'

export const runOnMainThread: ExecutionStrategyStart = ({
  canvasElement,
  initialDemo
}): ExecutionStrategy => {
  const gl: WebGL2RenderingContext | WebGLRenderingContext = getWebGLContext(canvasElement)
  setClearCanvas(() => gl.clear(gl.COLOR_BUFFER_BIT))
  const stopMainLoop: StopMainLoop = onContext(
    gl,
    shouldRun,
    mainLoop,
    getDrawBuffer,
    flushDrawBuffer,
    mutateMatrix,
    pixelsPerMeterGetter
  )
  const changeDemo: ChangeDemo = (demo: Demo): void => {
    void switchDemo(demo)
  }
  changeDemo(initialDemo)

  return {
    changeDemo,
    destroy: () => {
      stopMainLoop()
    }
  }
}