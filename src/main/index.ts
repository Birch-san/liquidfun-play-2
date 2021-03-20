import App from './App.svelte'

const app = new App({
  target: document.body
})

export default app

const worker = new Worker(new URL('../worker/index.js', import.meta.url))

worker.onmessage = ({ data }: MessageEvent<import('../worker/index').Data>) =>
  console.log(data.message)
worker.onmessageerror = (event: MessageEvent) =>
  console.error('onmessageerror', event)
worker.onerror = (event: ErrorEvent) =>
  console.error('onerror', event)

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