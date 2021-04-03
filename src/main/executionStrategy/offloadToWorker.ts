import type { CanvasFromMain, Demo, FromWorker, SwitchDemo } from '../../common/protocol'
import type { ChangeDemo, ExecutionStrategy, ExecutionStrategyStart } from './index'

export const offloadToWorker: ExecutionStrategyStart = ({
  canvasElement,
  setFatalError,
  initialDemo,
  replaceCanvas
}): ExecutionStrategy => {
  const worker = new Worker(new URL('../../worker/index.js', import.meta.url), {
    type: 'module'
  })

  const changeDemo: ChangeDemo = (demo: Demo): void => {
    const message: SwitchDemo = {
      type: 'switchDemo',
      demo
    }
    worker.postMessage(message)
  }

  const transferControlToOffscreen = (): void => {
    if (!('transferControlToOffscreen' in canvasElement)) {
      throw new Error('WebGL in Worker unsupported')
    }
    const offscreenCanvas: OffscreenCanvas = canvasElement.transferControlToOffscreen()
    const message: CanvasFromMain = {
      type: 'offscreenCanvas',
      offscreenCanvas
    }
    worker.postMessage(message, [offscreenCanvas])
  }

  worker.onmessage = ({ data }: MessageEvent<FromWorker>) => {
    if (data.type === 'ready') {
      transferControlToOffscreen()
      changeDemo(initialDemo)
    } else {
      console.log(data)
    }
  }

  worker.onmessageerror = (event: MessageEvent) =>
    console.error('onmessageerror', event)
  worker.onerror = (event: ErrorEvent) => {
    setFatalError(event.message)
    console.error('onerror', event)
  }

  return {
    changeDemo,
    destroy: () => {
      worker.terminate()
      replaceCanvas()
    }
  }
}