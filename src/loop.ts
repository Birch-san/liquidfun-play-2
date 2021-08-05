import type { Draw, Effect } from './onContext'

export type MainLoop = (intervalMs: number) => void
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

const onStatsParams: OnStatsParams = {
  statsType: 'animationFrame',
  stats: {
    avgFrameDurationMs: 0,
    avgFrameRate: 0
  }
}

// our "time elapsed since last rAF" isn't super-consistent
// 16.66899999999987
// 16.669000000001688
// probably because it takes some cycles for us to compute the difference
// use a tolerance factor when determining "how many 60ths of a second have elapsed"
const toleranceMs = 0.1

/**
 * if we're scheduled infrequently, compute up to 1/20th of a second to try and combat motion-sickness.
 * admittedly there's time to compute more: simulating 1/60th a second of physics
 * takes ~3ms and our deadline is ~16ms before the next animation frame is scheduled.
 * but if we're being scheduled less frequently than 60fps, it probably means we're
 * having trouble keeping up, or are being deliberately throttled (e.g. backgrounded).
 * we also don't want to heat up our CPU as we could worsen the problem.
 */
const maxIntervalToSimulate = frameIntervalMs * 3

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
    lastMs = nowMs
    {
      statsState.animationFrame.frameDurationIx = (statsState.animationFrame.frameDurationIx + 1) % statsState.animationFrame.frameDurationsMs.length
      statsState.animationFrame.frameDurationsMs[statsState.animationFrame.frameDurationIx] = elapsedMs
      const avgFrameDurationMs = statsState.animationFrame.frameDurationsMs.reduce<number>((acc, next) => acc + next, 0) / statsState.physics.frameDurationsMs.length
      onStatsParams.statsType = 'animationFrame'
      onStatsParams.stats.avgFrameDurationMs = avgFrameDurationMs
      onStatsParams.stats.avgFrameRate = 1 / avgFrameDurationMs * 1000
      onStats(onStatsParams)
    }

    const preMeasureMs = performance.now()

    /**
     * animation frames are typically scheduled at 60fps,
     * but if CPU is struggling they get throttled to e.g. 30fps or 20fps.
     *
     * we have tuned our number of particle iterations to give realistic results for simulating 1/60th second.
     * shorter timesteps (1/120, 1/144) look realistic too with this number of particle iterations.
     * but longer timesteps (1/30, 1/20) look bouncy.
     *
     * time step and iteration count are unrelated:
     * https://google.github.io/liquidfun/Programmers-Guide/html/md__chapter02__hello__box2_d.html#stw
     * if we want to simulate more than 1/60th of a second, we should do so by simulating 1/60th multiple times,
     * rather than by cranking up particle iterations.
     */
    for (let simulatedMs = 0; simulatedMs < Math.min(elapsedMs, maxIntervalToSimulate) - toleranceMs;) {
      const simulateMs = Math.min(elapsedMs, frameIntervalMs)
      physics(simulateMs)
      simulatedMs += simulateMs
    }

    {
      const durationMs = performance.now() - preMeasureMs
      statsState.physics.frameDurationIx = (statsState.physics.frameDurationIx + 1) % statsState.physics.frameDurationsMs.length
      statsState.physics.frameDurationsMs[statsState.physics.frameDurationIx] = durationMs
      const avgFrameDurationMs = statsState.physics.frameDurationsMs.reduce<number>((acc, next) => acc + next, 0) / statsState.physics.frameDurationsMs.length
      onStatsParams.statsType = 'physics'
      onStatsParams.stats.avgFrameDurationMs = avgFrameDurationMs
      onStatsParams.stats.avgFrameRate = 1 / avgFrameDurationMs * 1000
      onStats(onStatsParams)
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