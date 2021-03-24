<script lang='ts'>
  import { onMount } from 'svelte'
  import { assert } from './assert'
  import { Demo } from '../protocol'
  import type { CanvasFromMain, FromWorker, SwitchDemo } from '../protocol'

  type ChangeDemo = (demo: Demo) => void
  let changeDemo: ChangeDemo | undefined

  const width = 800
  const height = 700

  let demo: Demo = Demo.Ramp
  const onChangeDemo = (event: Event): void => {
    event.stopPropagation()
    changeDemo?.(demo)
  }

  let canvasElement: HTMLCanvasElement | undefined
  
  onMount(() => {
    const worker = new Worker(new URL('../worker/index.js', import.meta.url), {
      type: 'module'
    })

    changeDemo = (demo: Demo): void => {
      const message: SwitchDemo = {
        type: 'switchDemo',
        demo
      }
      worker.postMessage(message)
    }

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
        assert(changeDemo)
        changeDemo(demo)
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

  <fieldset>
    <legend>Demo</legend>
    <label>
      <input type=radio bind:group={demo} value={Demo.Ramp} on:change={onChangeDemo}>
      Ramp
    </label>
    <label>
      <input type=radio bind:group={demo} value={Demo.WaveMachine} on:change={onChangeDemo}>
      Wave machine
    </label>
    <label>
      <input type=radio bind:group={demo} value={Demo.None} on:change={onChangeDemo}>
      None
    </label>
  </fieldset>
</div>