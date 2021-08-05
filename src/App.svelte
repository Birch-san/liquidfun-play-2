<script lang='ts'>
  import { onMount } from 'svelte'
  import { assert } from './assert'
  import { getWebGLContext } from './getWebGLContext'
  import type { Draw, OnContextParams } from './onContext'
  import { Effect, onContext } from './onContext'
  import type { ClickPos } from './demo'
  import { Demo, WaveMachineGravity } from './demo'
  import type { DemoParams } from './demoSwitcher'
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
  import type { StatsType, Stats, OnSimulationSpeedParams, OnStatsParams } from './loop'
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

  let simulationSpeedPercent = 0

  let canvasElement: HTMLCanvasElement | undefined

  let demo: Demo = Demo.Gravity

  const demoParams: DemoParams = {
    waveMachineGravity: WaveMachineGravity.Down,
    dragEnabled: false
  }
  
  const onChangeDemo = (event: Event): void => {
    event.stopPropagation()
    switchDemo(demo, demoParams)
  }

  const onChangeDemoParams = (event: Event): void => {
    event.stopPropagation()
    switchDemo(demo, demoParams)
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
    switchDemo(demo, demoParams)
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
        Object.assign(statsModel[statsType], stats)
        // trigger Svelte's change-detection
        statsModel = statsModel
      },
      onSimulationSpeed: ({ percent }: OnSimulationSpeedParams) => {
        simulationSpeedPercent = percent
      }
    })
  })
</script>
  
<style>
  table.perf {
    table-layout: fixed;
  }
  table.perf td, table.perf th {
    padding-left: 0;
    padding-right: 0;
  }
  .perf-head {
    font-size: 0.8em;
    font-weight: bold;
  }
  details {
    margin-bottom: 1em;
  }
  details > summary {
    font-size: 0.8em;
    text-decoration-style: dotted;
    text-decoration-color: black;
    text-decoration-line: underline;
    cursor: pointer;
  }
  details > summary:first-of-type {
    display: block;
    /* counter-increment: list-item 0;
    list-style: inside disclosure-closed; */
  }
  .perf-reading-head {
    text-align: right;
  }
  .perf-head-column {
    width: 8em;
  }
  .perf-reading {
    text-align: right;
    font-family: monospace;
    width: 6em;
    height: 1em;
  }
</style>

<p><small>
{#if hasSIMD}
Your browser supports <a href="https://v8.dev/features/simd">WebAssembly SIMD</a>, so we will use it.
{:else}
Your browser does not support a <a href="https://v8.dev/features/simd">WebAssembly SIMD</a>; falling back to standard WebAssembly featureset.
{/if}
</small></p>
<table class="perf">
  <thead>
    <th class="info-head perf-head-column"></th>
    <th class="perf-head perf-head-column perf-reading-head">Duration (ms)</th>
    <th class="perf-head perf-head-column perf-reading-head">Rate (/sec)</th>
  </thead>
  <tbody>
    <tr>
      <td class="perf-head">Physics</td>
      <td class="perf-reading">{statsModel.physics.avgFrameDurationMs.toFixed(2)}</td>
      <td class="perf-reading">{Math.floor(statsModel.physics.avgFrameRate)}</td>
    </tr>
    <tr>
      <td class="perf-head">Render (on-CPU)</td>
      <td class="perf-reading">{statsModel.render.avgFrameDurationMs.toFixed(2)}</td>
      <td class="perf-reading">{Math.floor(statsModel.render.avgFrameRate)}</td>
    </tr>
    <tr>
      <td class="perf-head">Paint interval</td>
      <td class="perf-reading">{statsModel.animationFrame.avgFrameDurationMs.toFixed(2)}</td>
      <td class="perf-reading">{Math.floor(statsModel.animationFrame.avgFrameRate)}</td>
    </tr>
  </tbody>
</table>
<table>
  <thead>
    <th class="info-head perf-head-column"></th>
    <th class="perf-head perf-head-column perf-reading-head">of real-time (%)</th>
  </thead>
  <tbody>
    <tr>
      <td class="perf-head">Simulation speed</td>
      <td class="perf-reading">{Math.ceil(simulationSpeedPercent)}</td>
    </tr>
  </tbody>
</table>
<details>
  <summary>Performance explanation</summary>
  <dl>
    <dt><small>Physics duration:</small></dt>
    <dd><small>time taken to run one timestep of the physics simulation</small></dd>
    <dt><small>Render duration:</small></dt>
    <dd><small>On-CPU time spent preparing vertex buffers and sending them to WebGL</small></dd>
    <dt><small>Paint interval:</small></dt>
    <dd><small>interval between requestAnimationFrame callbacks (i.e. how frequently the browser repaints)</small></dd>
    <dt><small>Simulation speed:</small></dt>
    <dd><small>if we determine that we lack the time to finish simulating the demanded duration: we exit early (after simulating only part of the elapsed time), and the result will be slow-motion.</small></dd>
  </dl>
  <p><small>
    Durations and rates displayed are the mean average of the last 10 frames computed.<br>
    Usually the bottleneck is the paint interval; we can simulate physics at a higher framerate, but browser does not ask us to paint any more frequently. Generally this will be <a href="https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame">capped at the refresh rate of the monitor</a>.<br>
    </small>
  </p>
  <p><small>
    Where <a href="https://v8.dev/features/simd">WebAssembly SIMD</a> is available, we benefit from the SIMD optimizations applied by LLVM's autovectorizer. This is not expected to affect a substantial amount of the hot paths in the code; on box2d-wasm I <a href="https://github.com/Birch-san/box2d.ts/pull/1">measured a &lt;1% speed difference</a>, but liquidfun-wasm's particle simulation hits different code which will autovectorize differently (not yet measured).
  </small></p>
  <p><small>
    The <strong>physics rate</strong> can be thought of as our <em>maximum achievable framerate</em> (though this simple extrapolation ignores realities like CPU temperature).<br>  
    The <strong>paint interval rate</strong> can be thought of as our actual achieved framerate.
  </small></p>
</details>
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
  {#if demo === Demo.Gravity}
  <div><small>A small planet is attached to your mouse, and attracts the water.</small></div>
  {/if}
  {#if demo === Demo.WaveMachine}
  <div><small>Click and drag with your mouse to push the water around.</small></div>
  {/if}
</fieldset>
{#if demo === Demo.Gravity}
<fieldset>
  <legend>Drag</legend>
  <label>
    <input type=checkbox bind:checked={demoParams.dragEnabled} on:change={onChangeDemoParams}>
    Enabled
  </label>
  <div><small>'Drag' simulates an atmosphere with a height 1 planet-radius above the surface of the planet. The atmosphere density varies like Earth's. Atmosphere slows down fast-moving particles, making them more likely to fall down to the planet than to continue orbiting. Drag is computationally-intensive and may reduce framerate.</small></div>
</fieldset>
{/if}
{#if demo === Demo.WaveMachine}
<fieldset>
  <legend>Gravity</legend>
  <label>
    <input type=radio bind:group={demoParams.waveMachineGravity} value={WaveMachineGravity.Down} on:change={onChangeDemoParams}>
    Down
  </label>
  <label>
    <input type=radio bind:group={demoParams.waveMachineGravity} value={WaveMachineGravity.None} on:change={onChangeDemoParams}>
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