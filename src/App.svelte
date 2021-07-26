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
    mutateMatrixMetresToCanvas,
    pixelsPerMeterGetter as getPixelsPerMeter,
    switchDemo,
    eventHandlers,
    setClearCanvas
  } from './demoSwitcher'
  import type { StatsType, Stats, OnStatsParams } from './loop'
  import { doLoop, statsTypes } from './loop'
  import { hasSIMD } from './hasSIMD'

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
  
  onMount(() => {
    assert(canvasElement)
    switchDemo(demo, waveMachineGravity)
    const gl: WebGL2RenderingContext | WebGLRenderingContext = getWebGLContext(canvasElement)
    setClearCanvas(() => gl.clear(gl.COLOR_BUFFER_BIT))
    const onContextParams: OnContextParams = {
      gl,
      getDrawBuffer,
      flushDrawBuffer,
      mutateMatrix,
      mutateMatrixMetresToCanvas,
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

{#if hasSIMD}
<div><small>Your browser supports <a href="https://v8.dev/features/simd">WebAssembly SIMD</a>, so we will use it.</small></div>
{:else}
<div><small>Your browser does not support a <a href="https://v8.dev/features/simd">WebAssembly SIMD</a>; falling back to standard WebAssembly featureset.</small></div>
{/if}
<dl>
  <dt><small>'Physics' speed:</small></dt>
  <dd><small>time taken to run one timestep of the physics simulation</small></dd>
  <dt><small>'AnimationFrame' speed:</small></dt>
  <dd><small>how frequently the browser repaints</small></dd>
</dl>
<p>
<small>On-CPU time taken to render the game world is neglible (~0.5ms with simple shader).<br>
Usually the bottleneck is AnimationFrame scheduling; we can simulate physics at a higher framerate, but browser does not want to paint any more frequently.<br>
"Achievable framerate" is an extrapolation that does not consider realities like CPU temperature.
</small>
</p>
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