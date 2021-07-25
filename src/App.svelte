<script lang='ts'>
  import { onMount } from 'svelte'
  import { assert } from './assert'
  import { getWebGLContext } from './getWebGLContext'
  import type { Draw, OnContextParams } from './onContext'
  import { Effect, onContext } from './onContext'
  import type { ClickPos } from './demo'
  import { Demo, WaveMachineGravity } from './demo'
  import {
    getDrawBuffer,
    flushDrawBuffer,
    mainLoop as physics,
    mutateMatrix,
    pixelsPerMeterGetter as getPixelsPerMeter,
    switchDemo,
    eventHandlers,
    setClearCanvas
  } from './demoSwitcher'
  import type { StatsType, Stats, OnStatsParams } from './loop'
  import { doLoop, statsTypes } from './loop'

  const width = 800
  const height = 700

  // eslint-disable-next-line no-return-assign
  let statsModel: Record<StatsType, Stats> = statsTypes.reduce<Partial<Record<StatsType, Stats>>>((acc, next) => (acc[next] = {
    avgFrameDurationMs: 0,
    avgFrameRate: 0
    // eslint-disable-next-line no-sequences
  }, acc), {}) as Record<StatsType, Stats>

  let canvasElement: HTMLCanvasElement | undefined

  let demo: Demo = Demo.Gravity

  let waveMachineGravity: WaveMachineGravity = WaveMachineGravity.Down
  
  const onChangeDemo = (event: Event): void => {
    event.stopPropagation()
    switchDemo(demo, waveMachineGravity)
  }

  const onChangeWaveMachineGravity = (event: Event): void => {
    event.stopPropagation()
    switchDemo(demo, waveMachineGravity)
  }

  let effect = Effect.Refraction

  // pre-allocate and re-use this message because I hate allocations
  const clickPos: ClickPos = {
    x: 0,
    y: 0
  }

  const updateMousePos = ({ clientX, clientY }: MouseEvent): void => {
    assert(canvasElement)
    const bounds = canvasElement.getBoundingClientRect()
    const { left, top, width, height } = bounds
    const physicalX = clientX - left
    const physicalY = clientY - top
    const xPhysicalToLogical = width / canvasElement.width
    const yPhysicalToLogical = height / canvasElement.height
    clickPos.x = physicalX / xPhysicalToLogical
    clickPos.y = physicalY / yPhysicalToLogical
  }

  const handleMouseDown = (event: MouseEvent): void => {
    event.preventDefault()
    updateMousePos(event)
    eventHandlers?.onMouseDown?.(clickPos)
  }

  const handleMouseUp = (event: MouseEvent): void => {
    event.preventDefault()
    updateMousePos(event)
    eventHandlers?.onMouseUp?.()
  }

  const handleMouseEnter = (event: MouseEvent): void => {
    event.preventDefault()
    updateMousePos(event)
    if (event.buttons & 1) {
      eventHandlers?.onMouseDown?.(clickPos)
    }
  }

  const handleMouseMove = (event: MouseEvent): void => {
    event.preventDefault()
    updateMousePos(event)
    eventHandlers?.onMouseMove?.(clickPos)
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
      getEffect: () => effect,
      physics,
      onStats: ({ statsType, stats }: OnStatsParams) => {
        statsModel[statsType] = stats
        // trigger Svelte's change-detection
        statsModel = statsModel
      }
    })
  })
</script>
  
<style>
  .fatal-error {
    color: darkred;
  }
  .perf-tracer {
    display: inline-block;
    width: 25em;
  }
</style>

{#if fatalError !== undefined}
  <pre class="fatal-error">{fatalError}</pre>
  <h3>Sorry, a fatal error occurred.</h3>
  <p>This experiment relies on a lot of new Web Worker functionality (<a href="https://stackoverflow.com/a/45578811/5257399">ES imports</a> and <a href="https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Functions_and_classes_available_to_workers"><code>requestAnimationFrame</code></a>). As such, it is currently only expected to work in Chrome/Chromium-based browsers. The plan for <a href="https://github.com/Birch-san/box2d-wasm/discussions/24#discussioncomment-540893">Firefox support</a> will be to use <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer"><code>SharedArrayBuffer</code></a>. The plan for <a href="https://caniuse.com/?search=SharedArrayBuffer">all other browsers</a> (e.g. Safari, Samsung Internet) will be to post large buffers via Web Worker <code>postMessage()</code>, or to avoid Web Workers (i.e. perform both physics simulation and rendering on the main thread).</p>
  <p>Here's a GIF of what it's <em>supposed</em> to look like:</p>
  <img src="https://birchlabs.co.uk/box2d-wasm-liquidfun/liquidfun.gif" width="350px" height="306">
{:else}
  <pre class="perf-tracer">
    Physics 
    Average frame duration (ms):
    {statsModel.physics.avgFrameDurationMs.toFixed(2)}
    Achievable frame rate (fps):
    {Math.floor(statsModel.physics.avgFrameRate)}
  </pre>
  <pre class="perf-tracer">
    AnimationFrame
    Average schedule wait (ms):
    {statsModel.animationFrame.avgFrameDurationMs.toFixed(2)}
    Achievable frame rate (fps):
    {Math.floor(statsModel.animationFrame.avgFrameRate)}
  </pre>
  <canvas
  bind:this={canvasElement}
  on:pointerdown={handleMouseDown}
  on:pointerup={handleMouseUp}
  on:pointerleave={handleMouseUp}
  on:pointerenter={handleMouseEnter}
  on:pointermove={handleMouseMove}
  width={width}
  height={height}
  ></canvas>
  <fieldset>
    <legend>Demo</legend>
    <label title="Basic use of Box2D without any liquidfun-specific features">
      <input type=radio bind:group={demo} value={Demo.Ramp} on:change={onChangeDemo}>
      Ramp
    </label>
    <label>
      <input type=radio bind:group={demo} value={Demo.Gravity} on:change={onChangeDemo}>
      Gravity
    </label>
    <label>
      <input type=radio bind:group={demo} value={Demo.WaveMachine} on:change={onChangeDemo}>
      Wave machine
    </label>
    <!-- <label title="In case your computer gets hot!">
      <input type=radio bind:group={demo} value={Demo.None} on:change={onChangeDemo}>
      None
    </label> -->
  </fieldset>
  {#if demo === Demo.Gravity}
  <div><small>A small planet is attached to your mouse, and attracts the water.</small></div>
  {/if}
  {#if demo === Demo.WaveMachine}
  <div><small>Click and drag with your mouse to push the water around.</small></div>
  <fieldset>
    <legend>Gravity</legend>
    <label>
      <input type=radio bind:group={waveMachineGravity} value={WaveMachineGravity.Down} on:change={onChangeWaveMachineGravity}>
      Down
    </label>
    <label>
      <input type=radio bind:group={waveMachineGravity} value={WaveMachineGravity.None} on:change={onChangeWaveMachineGravity}>
      None
    </label>
  </fieldset>
  {/if}
  {#if [Demo.Gravity, Demo.WaveMachine].includes(demo) }
  <fieldset>
    <legend>Particle Shader</legend>
    <label>
      <input type=radio bind:group={effect} value={Effect.None}>
      Simple
    </label>
    <label>
      <input type=radio bind:group={effect} value={Effect.Refraction}>
      Refraction
    </label>
    <label>
      <input type=radio bind:group={effect} value={Effect.TemporalBlend}>
      Temporal blend
    </label>
  </fieldset>
  {/if}
{/if}