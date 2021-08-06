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
export const statsTypes = ['physics', 'render', 'animationFrame'] as const
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
export interface OnSimulationSpeedParams {
  percent: number
}

export type GetEffect = () => Effect
export type OnStats = (stats: OnStatsParams) => void
export type OnSimulationSpeed = (stats: OnSimulationSpeedParams) => void
export interface DoLoopParams {
  draw: Draw
  physics: MainLoop
  onStats: OnStats
  onSimulationSpeed: OnSimulationSpeed
  getEffect: GetEffect
}

const onStatsParams: OnStatsParams = {
  statsType: 'animationFrame',
  stats: {
    avgFrameDurationMs: 0,
    avgFrameRate: 0
  }
}
const onSimulationSpeedParams: OnSimulationSpeedParams = {
  percent: 0
}

/**
 * our "time elapsed since last rAF" isn't super-consistent:
 * 16.66899999999987
 * 16.669000000001688
 * perhaps because it takes some cycles for us to compute the difference.
 *
 * it's better to compute Step(16.4) than to simulate no physics at all
 * and simulate Step(16.4 + x) on the next frame.
 * 
 * so this variable is "are we close enough to 1/60th of a second"
 */
const toleranceMs = 0.2

/**
 * if we're scheduled infrequently, compute up to 1/20th of a second to try and combat motion-sickness.
 * admittedly there's time to compute more: simulating 1/60th a second of physics
 * takes ~3ms and our deadline is ~16ms before the next animation frame is scheduled.
 * but if we're being scheduled less frequently than 60fps, it probably means we're
 * having trouble keeping up, or are being deliberately throttled (e.g. backgrounded).
 * we also don't want to heat up our CPU as we could worsen the problem.
 */
const maxIntervalToSimulate = frameIntervalMs * 3

/**
 * we want to finish comfortably within 1/60th of a second,
 * otherwise scheduler won't ask us for another animation frame
 * 1/60 secs from now.
 * note that physics isn't the only thing we compute per time step,
 * but it substantially dominates time (e.g. rendering happens afterward,
 * but takes only ~1ms on-CPU time)
 */
const physicsDeadlineMs = frameIntervalMs * 0.7

export const doLoop = ({
  draw,
  physics,
  onStats,
  onSimulationSpeed,
  getEffect
}: DoLoopParams): StopLoop => {
  let renderHandle: number | undefined
  let lastMs: number | undefined

  let timeDebtMs = 0
  let skip = false
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

    const beforePhysicsMs = performance.now()

    /**
     * animation frames are typically scheduled at 60fps,
     * but if CPU is struggling they get throttled to e.g. 30fps or 20fps.
     *
     * we have tuned our number of particle iterations to give realistic results for simulating 1/60th second.
     * shorter timesteps (1/120, 1/144) explode out further.
     * longer timesteps (1/30, 1/20) clump together.
     * some browser interactions (e.g. selecting text on Safari) cause rAF to schedule us far more frequently than 60fps.
     * we must not simulate too short of a timestep, as that will cause particles to explode out.
     *
     * time step and iteration count are unrelated:
     * https://google.github.io/liquidfun/Programmers-Guide/html/md__chapter02__hello__box2_d.html#stw
     * if we want to simulate more than 1/60th of a second, we should do so by simulating 1/60th multiple times,
     * rather than by cranking up particle iterations.
     * if we want to simulate less than 1/60th of a second... we should do so by accumulating the time and waiting
     * for the next schedule.
     */
    const intendedToSimulateMs = elapsedMs + timeDebtMs
    let toSimulateMs = intendedToSimulateMs
    skip = toSimulateMs < frameIntervalMs - toleranceMs
    let iterations = 0
    let computationTimeAccMs = 0
    let badDebtMs = 0
    while (toSimulateMs >= frameIntervalMs - toleranceMs) {
      if (iterations > 0) {
        computationTimeAccMs = performance.now() - beforePhysicsMs
        const avgComputationTimeMs = computationTimeAccMs / iterations
        const timeToSimulateAnother60thMs = computationTimeAccMs + avgComputationTimeMs
        if (timeToSimulateAnother60thMs > physicsDeadlineMs) {
          /**
           * there's not enough time to compute this next iteration.
           * this will look like slow-motion (and cause motion-sickness).
           * nevertheless: throttling the simulation is our best option
           * (lets the CPU cool down).
           */
          badDebtMs = toSimulateMs
          toSimulateMs = 0
          break
        }
      }
      iterations++
      const simulateMs = Math.min(toSimulateMs, frameIntervalMs + toleranceMs)
      physics(simulateMs)
      toSimulateMs -= simulateMs
    }
    timeDebtMs = Math.min(toSimulateMs, maxIntervalToSimulate)

    const timeRemainingToSimulateMs = toSimulateMs + badDebtMs
    const actuallySimulatedMs = intendedToSimulateMs - timeRemainingToSimulateMs
    onSimulationSpeedParams.percent = actuallySimulatedMs / intendedToSimulateMs * 100
    onSimulationSpeed(onSimulationSpeedParams)

    {
      const durationMs = performance.now() - beforePhysicsMs
      statsState.physics.frameDurationIx = (statsState.physics.frameDurationIx + 1) % statsState.physics.frameDurationsMs.length
      statsState.physics.frameDurationsMs[statsState.physics.frameDurationIx] = durationMs
      const avgFrameDurationMs = statsState.physics.frameDurationsMs.reduce<number>((acc, next) => acc + next, 0) / statsState.physics.frameDurationsMs.length
      onStatsParams.statsType = 'physics'
      onStatsParams.stats.avgFrameDurationMs = avgFrameDurationMs
      onStatsParams.stats.avgFrameRate = 1 / avgFrameDurationMs * 1000
      onStats(onStatsParams)
    }

    const beforeDrawMs = performance.now()

    if (!skip) {
      draw(getEffect(), elapsedMs + timeDebtMs)
    }

    {
      const durationMs = performance.now() - beforeDrawMs
      statsState.render.frameDurationIx = (statsState.render.frameDurationIx + 1) % statsState.render.frameDurationsMs.length
      statsState.render.frameDurationsMs[statsState.render.frameDurationIx] = durationMs
      const avgFrameDurationMs = statsState.render.frameDurationsMs.reduce<number>((acc, next) => acc + next, 0) / statsState.render.frameDurationsMs.length
      onStatsParams.statsType = 'render'
      onStatsParams.stats.avgFrameDurationMs = avgFrameDurationMs
      onStatsParams.stats.avgFrameRate = 1 / avgFrameDurationMs * 1000
      onStats(onStatsParams)
    }

    renderHandle = requestAnimationFrame(renderTask)
  }
  renderHandle = requestAnimationFrame(renderTask)
  return (): void => {
    if (renderHandle !== undefined) {
      cancelAnimationFrame(renderHandle)
    }
  }
}