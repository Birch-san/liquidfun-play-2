import App from './App.svelte'
import type { FromMainThread, FromWorker } from '../protocol'

const app = new App({
  target: document.body
})

export default app

const worker = new Worker(new URL('../worker/index.js', import.meta.url), {
  type: 'module'
})

worker.onmessage = ({ data: { message } }: MessageEvent<FromWorker>) =>
  console.log(message)
worker.onmessageerror = (event: MessageEvent) =>
  console.error('onmessageerror', event)
worker.onerror = (event: ErrorEvent) =>
  console.error('onerror', event)

const renderIntervalMs = 1 / 10 * 1000
setInterval(() => {
  const data: FromMainThread = {
    message: 'please render'
  }
  worker.postMessage(data)
}, renderIntervalMs)

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/concepts/hot-module-replacement
// eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
if (import.meta.hot) {
  import.meta.hot.accept()
  import.meta.hot.dispose(() => {
    app.$destroy()
    worker.terminate()
  })
}