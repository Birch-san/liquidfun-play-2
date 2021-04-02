<script lang='ts'>
  import { onMount } from 'svelte'
  import { assert } from './assert'
  import { Demo } from '../protocol'
  import type { CanvasFromMain, FromWorker, SwitchDemo } from '../protocol'

  type ChangeDemo = (demo: Demo) => void
  let changeDemo: ChangeDemo | undefined

  const width = 800
  const height = 700

  let demo: Demo = Demo.WaveMachine
  const onChangeDemo = (event: Event): void => {
    event.stopPropagation()
    changeDemo?.(demo)
  }

  let canvasElement: HTMLCanvasElement | undefined
  let fatalError: string | undefined
  
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
    worker.onerror = (event: ErrorEvent) => {
      fatalError = event.message
      console.error('onerror', event)
      console.error('onerror', fatalError)
    }

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
  .middle-col {
	  margin-left: auto;
    margin-right: auto;
    width: 800px;
  }
  .fatal-error {
    color: darkred;
  }
  canvas {
    border: 1px solid black;
  }
</style>
  
<div class="middle-col">
  {#if fatalError !== undefined}
    <h2>Sorry, a fatal error occurred.</h2>
    <p>This experiment relies on a lot of new Web Worker functionality (<a href="https://stackoverflow.com/a/45578811/5257399">ES imports</a> and <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Functions_and_classes_available_to_workers"><code>requestAnimationFrame</code></a>). As such, it is currently only expected to work in Chrome/Chromium-based browsers. The plan for <a href="https://github.com/Birch-san/box2d-wasm/discussions/24#discussioncomment-540893">Firefox support</a> will be to use <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer"><code>SharedArrayBuffer</code></a>. The plan for <a href="https://caniuse.com/?search=SharedArrayBuffer">all other browsers</a> (e.g. Safari, Samsung Internet) will be to post large buffers via Web Worker <code>postMessage()</code>, or to avoid Web Workers (i.e. perform both physics simulation and rendering on the main thread).</p>
    <pre class="fatal-error">{fatalError}</pre>
  {:else}
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
  {/if}
</div>