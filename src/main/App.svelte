<script lang='ts'>
  import { onMount } from 'svelte'
  import { assert } from './assert'
  import type { CanvasFromMain, FromWorker } from '../protocol'

  const width = 400
  const height = 300

  let canvasElement: HTMLCanvasElement | undefined
  
  onMount(() => {
    const worker = new Worker(new URL('../worker/index.js', import.meta.url), {
      type: 'module'
    })

    const transferControlToOffscreen = (): void => {
      assert(canvasElement)
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
      } else {
        console.log(data)
      }
    }

    worker.onmessageerror = (event: MessageEvent) =>
      console.error('onmessageerror', event)
    worker.onerror = (event: ErrorEvent) =>
      console.error('onerror', event)

    return () => {
      worker.terminate()
    }
  })
</script>
  
<style>
	:global(body) {
	  margin: 0;
	  font-family: Arial, Helvetica, sans-serif;
	}
	.App {
	  text-align: center;
	}
  canvas {
    border: 1px solid black;
  }
</style>
  
<div class="App">
  <canvas bind:this={canvasElement} width={width} height={height}></canvas>
</div>