import type { Draw } from './onContext'

// export type ShouldRun = (intervalMs: number) => boolean
export type MainLoop = (intervalMs: number) => void
// export type StopMainLoop = () => void
export type StopLoop = () => void

export const frameLimit = 60
export const frameIntervalMs = 1 / frameLimit * 1000

const frameDurationsMs = new Float32Array(10)
let frameDurationIx = 0
export interface Stats {
  avgFrameDurationMs: number
  avgFrameRate: number
}

export type OnStats = (stats: Stats) => void
export interface DoLoopParams {
  draw: Draw
  physics: MainLoop
  onStats: OnStats
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

export const doLoop = ({
  draw,
  physics
}: DoLoopParams): StopLoop => {
  let renderHandle: number | undefined
  let startMs: number | undefined
  const renderTask = (nowMs: number): void => {
    if (startMs === undefined) {
      startMs = nowMs
    }
    const elapsedMs = nowMs - startMs
    physics(elapsedMs)
    draw()
    renderHandle = requestAnimationFrame(renderTask)
  }
  renderHandle = requestAnimationFrame(renderTask)
  return (): void => {
    if (renderHandle !== undefined) {
      cancelAnimationFrame(renderHandle)
    }
  }
}