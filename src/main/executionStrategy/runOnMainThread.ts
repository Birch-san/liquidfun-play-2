import type { Demo } from '../../common/protocol'
import type { ChangeDemo, ExecutionStrategy, ExecutionStrategyStart } from './index'
import type { StopMainLoop } from '../../common/onContext'
import { onContext } from '../../common/onContext'
import {
  shouldRun,
  mainLoop,
  getDrawBuffer,
  flushDrawBuffer,
  mutateMatrix,
  pixelsPerMeterGetter,
  switchDemo,
  setClearCanvas
} from '../../common/demoSwitcher'
import { getWebGLContext } from '../../common/getWebGLContext'

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