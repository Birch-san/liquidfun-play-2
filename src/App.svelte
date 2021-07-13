<script lang='ts'>
  import { onMount } from 'svelte'
  import { assert } from './assert'
  import { Demo } from './protocol'
  import { getWebGLContext } from './getWebGLContext'
  import type { Draw, OnContextParams } from './onContext'
  import { onContext } from './onContext'
  import {
    getDrawBuffer,
    flushDrawBuffer,
    mainLoop as physics,
    mutateMatrix,
    pixelsPerMeterGetter as getPixelsPerMeter,
    switchDemo,
    setClearCanvas
  } from './demoSwitcher'
  import { doLoop } from './loop'

  const width = 800
  const height = 700

  let avgFrameDurationMs: number = 0
  let avgFrameRate: number = 0

  let canvasElement: HTMLCanvasElement | undefined

  let demo: Demo = Demo.WaveMachine

  const onChangeDemo = (event: Event): void => {
    event.stopPropagation()
    switchDemo(demo)
  }

  let fatalError: string | undefined
  
  onMount(() => {
    assert(canvasElement)
    switchDemo(demo)
    const gl: WebGL2RenderingContext | WebGLRenderingContext = getWebGLContext(canvasElement)
    setClearCanvas(() => gl.clear(gl.COLOR_BUFFER_BIT))
    const onContextParams: OnContextParams = {
      gl,
      getDrawBuffer,
      flushDrawBuffer,
      mutateMatrix,
      getPixelsPerMeter
    }
    const draw: Draw = onContext(onContextParams)

    return doLoop({
      draw,
      physics,
      onStats: (stats) => {
        ({ avgFrameDurationMs, avgFrameRate } = stats)
      }
    })
  })
</script>
  
<style>
  .middle-col {
	  margin-left: auto;
    margin-right: auto;
    width: 800px;
  }
  .fatal-error {
    color: darkred;
  }
</style>
  
<div class="middle-col">
  {#if fatalError !== undefined}
    <pre class="fatal-error">{fatalError}</pre>
    <h3>Sorry, a fatal error occurred.</h3>
    <p>This experiment relies on a lot of new Web Worker functionality (<a href="https://stackoverflow.com/a/45578811/5257399">ES imports</a> and <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Functions_and_classes_available_to_workers"><code>requestAnimationFrame</code></a>). As such, it is currently only expected to work in Chrome/Chromium-based browsers. The plan for <a href="https://github.com/Birch-san/box2d-wasm/discussions/24#discussioncomment-540893">Firefox support</a> will be to use <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer"><code>SharedArrayBuffer</code></a>. The plan for <a href="https://caniuse.com/?search=SharedArrayBuffer">all other browsers</a> (e.g. Safari, Samsung Internet) will be to post large buffers via Web Worker <code>postMessage()</code>, or to avoid Web Workers (i.e. perform both physics simulation and rendering on the main thread).</p>
    <p>Here's a GIF of what it's <em>supposed</em> to look like:</p>
    <img src="https://birchlabs.co.uk/box2d-wasm-liquidfun/liquidfun.gif" width="350px" height="306">
  {:else}
    <pre>
      Average frame duration (ms):
      {avgFrameDurationMs.toFixed(2)}
      Average frame rate (fps):
      {Math.floor(avgFrameRate)}
    </pre>
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