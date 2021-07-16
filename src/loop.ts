import type { Draw, Effect } from './onContext'

// export type ShouldRun = (intervalMs: number) => boolean
export type MainLoop = (intervalMs: number) => void
// export type StopMainLoop = () => void
export type StopLoop = () => void

export const frameLimit = 60
export const frameIntervalMs = 1 / frameLimit * 1000

const statsSamples = 10
interface StatsState {
  frameDurationsMs: Float32Array
  frameDurationIx: number
}
export const statsTypes = ['physics', 'animationFrame'] as const
export type StatsType = typeof statsTypes[number]
// eslint-disable-next-line no-return-assign
const statsState: Record<StatsType, StatsState> = statsTypes.reduce<Partial<Record<StatsType, StatsState>>>((acc, next) => (acc[next] = {
  frameDurationsMs: new Float32Array(statsSamples),
  frameDurationIx: 0
  // eslint-disable-next-line no-sequences
}, acc), {}) as Record<StatsType, StatsState>
export interface OnStatsParams {
  statsType: StatsType
  stats: Stats
}
export interface Stats {
  avgFrameDurationMs: number
  avgFrameRate: number
}

export type GetEffect = () => Effect
export type OnStats = (stats: OnStatsParams) => void
export interface DoLoopParams {
  draw: Draw
  physics: MainLoop
  onStats: OnStats
  getEffect: GetEffect
}
// export const doLoop = ({
//   draw,
//   physics,
//   onStats
// }: DoLoopParams): StopLoop => {
//   let drew = false
//   let physicsHandle: number | undefined
//   const physicsTask = (): void => {
//     if (!document.hidden) {
//       // const nowMs = performance.now()
//       physics(frameIntervalMs)
//       // const durationMs = performance.now() - nowMs
//       // frameDurationIx = (frameDurationIx + 1) % frameDurationsMs.length
//       // frameDurationsMs[frameDurationIx] = durationMs
//       // const avgFrameDurationMs = frameDurationsMs.reduce<number>((acc, next) => acc + next, 0) / frameDurationsMs.length
//       // onStats({
//       //   avgFrameDurationMs: avgFrameDurationMs,
//       //   avgFrameRate: 1 / avgFrameDurationMs * 1000
//       // })
//       drew = false
//     }
//     physicsHandle = setTimeout(physicsTask, frameIntervalMs)
//   }
//   physicsTask()

//   let renderHandle: number | undefined
//   const renderTask = (): void => {
//     if (!drew) {
//       draw()
//       drew = true
//     }
//     renderHandle = requestAnimationFrame(renderTask)
//   }
//   renderTask()

//   return (): void => {
//     clearTimeout(physicsHandle)
//     if (renderHandle !== undefined) {
//       cancelAnimationFrame(renderHandle)
//     }
//   }
// }

// export const doLoop = ({
//   draw,
//   physics
// }: DoLoopParams): StopLoop => {
//   let renderHandle: number | undefined
//   const renderTask = (): void => {
//     if (!document.hidden) {
//       physics(frameIntervalMs)
//       draw()
//     }
//     renderHandle = requestAnimationFrame(renderTask)
//   }
//   renderTask()
//   return (): void => {
//     if (renderHandle !== undefined) {
//       cancelAnimationFrame(renderHandle)
//     }
//   }
// }

// export const doLoop = ({
//   draw,
//   physics
// }: DoLoopParams): StopLoop => {
//   let drew = false
//   let physicsHandle: number | undefined
//   const physicsTask = (): void => {
//     if (!document.hidden) {
//       physics(frameIntervalMs)
//       drew = false
//     }
//   }
//   physicsTask()
//   setInterval(physicsTask, frameIntervalMs)

//   let renderHandle: number | undefined
//   const renderTask = (): void => {
//     if (!drew) {
//       draw()
//       drew = true
//     }
//     renderHandle = requestAnimationFrame(renderTask)
//   }
//   renderTask()

//   return (): void => {
//     clearInterval(physicsHandle)
//     if (renderHandle !== undefined) {
//       cancelAnimationFrame(renderHandle)
//     }
//   }
// }

// export const doLoop = ({
//   draw,
//   physics,
//   onStats
// }: DoLoopParams): StopLoop => {
//   let renderHandle: number | undefined
//   let lastMs: number | undefined
//   const renderTask = (): void => {
//     const nowMs = performance.now()
//     if (lastMs === undefined) {
//       lastMs = nowMs - frameIntervalMs
//     }
//     const elapsedMs = nowMs - lastMs
//     {
//       statsState.animationFrame.frameDurationIx = (statsState.animationFrame.frameDurationIx + 1) % statsState.animationFrame.frameDurationsMs.length
//       statsState.animationFrame.frameDurationsMs[statsState.animationFrame.frameDurationIx] = elapsedMs
//       const avgFrameDurationMs = statsState.animationFrame.frameDurationsMs.reduce<number>((acc, next) => acc + next, 0) / statsState.physics.frameDurationsMs.length
//       onStats({
//         statsType: 'animationFrame',
//         stats: {
//           avgFrameDurationMs: avgFrameDurationMs,
//           avgFrameRate: 1 / avgFrameDurationMs * 1000
//         }
//       })
//     }
//     lastMs = nowMs

//     const preMeasureMs = performance.now()

//     // animation frames seem to be scheduled not necessarily
//     // at 60fps, but sometimes 30fps or 20fps.
//     // be prepared to calculate 3 frames of physics in normal operation.
//     // any more infrequent than that probably indicates page got backgrounded;
//     // if we detect a long gap, we shouldn't attempt to catch up.
//     physics(Math.min(elapsedMs, frameIntervalMs * 3))

//     {
//       const durationMs = performance.now() - preMeasureMs
//       statsState.physics.frameDurationIx = (statsState.physics.frameDurationIx + 1) % statsState.physics.frameDurationsMs.length
//       statsState.physics.frameDurationsMs[statsState.physics.frameDurationIx] = durationMs
//       const avgFrameDurationMs = statsState.physics.frameDurationsMs.reduce<number>((acc, next) => acc + next, 0) / statsState.physics.frameDurationsMs.length
//       onStats({
//         statsType: 'physics',
//         stats: {
//           avgFrameDurationMs: avgFrameDurationMs,
//           avgFrameRate: 1 / avgFrameDurationMs * 1000
//         }
//       })
//     }

//     draw()
//     renderHandle = setTimeout(renderTask, frameIntervalMs)
//   }
//   renderTask()
//   return (): void => {
//     clearTimeout(renderHandle)
//   }
// }

export const doLoop = ({
  draw,
  physics,
  onStats,
  getEffect
}: DoLoopParams): StopLoop => {
  let renderHandle: number | undefined
  let lastMs: number | undefined
  const renderTask = (nowMs: number): void => {
    if (lastMs === undefined) {
      lastMs = nowMs - frameIntervalMs
    }
    const elapsedMs = nowMs - lastMs
    {
      statsState.animationFrame.frameDurationIx = (statsState.animationFrame.frameDurationIx + 1) % statsState.animationFrame.frameDurationsMs.length
      statsState.animationFrame.frameDurationsMs[statsState.animationFrame.frameDurationIx] = elapsedMs
      const avgFrameDurationMs = statsState.animationFrame.frameDurationsMs.reduce<number>((acc, next) => acc + next, 0) / statsState.physics.frameDurationsMs.length
      onStats({
        statsType: 'animationFrame',
        stats: {
          avgFrameDurationMs: avgFrameDurationMs,
          avgFrameRate: 1 / avgFrameDurationMs * 1000
        }
      })
    }
    lastMs = nowMs

    const preMeasureMs = performance.now()

    // animation frames seem to be scheduled not necessarily
    // at 60fps, but sometimes 30fps or 20fps.
    // be prepared to calculate 3 frames of physics in normal operation.
    // any more infrequent than that probably indicates page got backgrounded;
    // if we detect a long gap, we shouldn't attempt to catch up.
    physics(Math.min(elapsedMs, frameIntervalMs * 3))

    {
      const durationMs = performance.now() - preMeasureMs
      statsState.physics.frameDurationIx = (statsState.physics.frameDurationIx + 1) % statsState.physics.frameDurationsMs.length
      statsState.physics.frameDurationsMs[statsState.physics.frameDurationIx] = durationMs
      const avgFrameDurationMs = statsState.physics.frameDurationsMs.reduce<number>((acc, next) => acc + next, 0) / statsState.physics.frameDurationsMs.length
      onStats({
        statsType: 'physics',
        stats: {
          avgFrameDurationMs: avgFrameDurationMs,
          avgFrameRate: 1 / avgFrameDurationMs * 1000
        }
      })
    }

    draw(getEffect(), elapsedMs)
    renderHandle = requestAnimationFrame(renderTask)
  }
  renderHandle = requestAnimationFrame(renderTask)
  return (): void => {
    if (renderHandle !== undefined) {
      cancelAnimationFrame(renderHandle)
    }
  }
}