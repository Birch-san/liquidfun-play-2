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

export const runOnMainThread: ExecutionStrategyStart = ({
  canvasElement,
  initialDemo
}): ExecutionStrategy => {
  let gl: WebGL2RenderingContext | WebGLRenderingContext | null = canvasElement.getContext('webgl2')
  if (gl === null) {
    console.warn('Failed to create WebGL2 rendering context; falling back to WebGL')
    gl = canvasElement.getContext('webgl')
  }
  if (gl === null) {
    throw new Error('Failed to create WebGL rendering context')
  }
  const glTruthy: WebGL2RenderingContext | WebGLRenderingContext = gl
  setClearCanvas(() => glTruthy.clear(glTruthy.COLOR_BUFFER_BIT))
  const stopMainLoop: StopMainLoop = onContext(
    glTruthy,
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