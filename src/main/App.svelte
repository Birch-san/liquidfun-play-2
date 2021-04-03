<script lang='ts'>
  import { onMount } from 'svelte'
  import { assert } from './assert'
  import { Demo } from '../common/protocol'
  import { ExecutionStrategyType } from './executionStrategy/index'
  import type { ChangeDemo, ExecutionStrategyDestroy, ExecutionStrategyStart, ExecutionStrategyStartOptions } from './executionStrategy/index'

  type ChangeExecutionStrategy = (strategy: ExecutionStrategyType) => void

  let destroy: ExecutionStrategyDestroy | undefined
  let changeDemo: ChangeDemo | undefined
  const changeExecutionStrategy: ChangeExecutionStrategy = async (strategyType: ExecutionStrategyType): Promise<void> => {
    destroy?.()
    assert(canvasElement)
    const strategyStartOptions: ExecutionStrategyStartOptions = {
      setFatalError: (message: string) => {
        fatalError = message
      },
      canvasElement,
      initialDemo: demo,
      replaceCanvas: () => {
        assert(canvasElement)
        canvasElement.replaceWith(canvasElement.cloneNode())
        canvasElement = document.getElementsByTagName('canvas')[0]
      }
    };
    ({ changeDemo, destroy } = (await {
      [ExecutionStrategyType.OffloadToWorker]: async (): Promise<ExecutionStrategyStart> => {
        const { offloadToWorker } = await import('./executionStrategy/offloadToWorker')
        return offloadToWorker
      },
      [ExecutionStrategyType.RunOnMainThread]: async (): Promise<ExecutionStrategyStart> => {
        const { runOnMainThread } = await import('./executionStrategy/runOnMainThread')
        return runOnMainThread
      }
    }[strategyType]())(strategyStartOptions))
  }

  const width = 800
  const height = 700

  let executionStrategy = ExecutionStrategyType.OffloadToWorker
  const onChangeExecutionStrategy = (event: Event): void => {
    event.stopPropagation()
    changeExecutionStrategy?.(executionStrategy)
  }

  let demo: Demo = Demo.WaveMachine
  const onChangeDemo = (event: Event): void => {
    event.stopPropagation()
    changeDemo?.(demo)
  }

  // we manage canvas outside of Svelte, for more control over recreation of canvas
  const makeCanvas = (): HTMLCanvasElement => {
    const canvas: HTMLCanvasElement = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
  }

  let canvasMount: HTMLDivElement | undefined
  let canvasElement: HTMLCanvasElement | undefined
  let fatalError: string | undefined
  
  onMount(() => {
    const proposedCanvas: HTMLCanvasElement = makeCanvas()
    assert(canvasMount)
    canvasElement = canvasMount.appendChild(proposedCanvas)
    changeExecutionStrategy(executionStrategy)

    return () => {
      destroy?.()
      canvasElement?.remove()
    }
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
    <div bind:this={canvasMount}/>
    <!-- <canvas bind:this={canvasElement} width={width} height={height}></canvas> -->
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
    <fieldset>
      <legend>Execution Strategy</legend>
      <label>
        <input type=radio bind:group={executionStrategy} value={ExecutionStrategyType.OffloadToWorker} on:change={onChangeExecutionStrategy}>
        Offload to worker
      </label>
      <label>
        <input type=radio bind:group={executionStrategy} value={ExecutionStrategyType.RunOnMainThread} on:change={onChangeExecutionStrategy}>
        Run on main thread
      </label>
    </fieldset>
  {/if}
</div>