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
 * moreover, we split our timestep into 1/60th of a second steps.
 * let's avoid computing Step(16.668) followed by Step(0.001)
 * because particles become a snowstorm if we try to compute too small a timestep.
 *
 * I've seen problems when tolerance is set as low as 0.2,
 * but 0.3 seemed stable.
 * rounding up to 1 for a bit more safety.
 */
const toleranceMs = 1

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
 * but it substantially dominates time (rendering happens afterward,
 * but takes ~1ms on-CPU time)
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
     * shorter timesteps (1/120, 1/144) look realistic too with this number of particle iterations.
     * but longer timesteps (1/30, 1/20) look bouncy.
     *
     * time step and iteration count are unrelated:
     * https://google.github.io/liquidfun/Programmers-Guide/html/md__chapter02__hello__box2_d.html#stw
     * if we want to simulate more than 1/60th of a second, we should do so by simulating 1/60th multiple times,
     * rather than by cranking up particle iterations.
     */
    let iterations = 0
    let computationTimeAccMs = 0
    let simulatedMs = 0
    const totalToSimulateMs = Math.min(elapsedMs, maxIntervalToSimulate)
    while (simulatedMs < totalToSimulateMs) {
      const remainingTimeToSimulateMs = totalToSimulateMs - simulatedMs
      const simulateMs = Math.min(remainingTimeToSimulateMs, frameIntervalMs)
      /**
       * if we're only 1ms away from completion: bundle it into this timestep
       * instead of computing a super-small timestep in a subsequent iteration.
       */
      const roundUpIfCloseMs = remainingTimeToSimulateMs - simulateMs < toleranceMs
        ? remainingTimeToSimulateMs
        : simulateMs
      physics(roundUpIfCloseMs)
      simulatedMs += roundUpIfCloseMs

      /**
       * why are we being asked to simulate more than 1/60th of a second?
       * if it's a one-off (e.g. process momentarily deprioritised, or GC pause),
       * then we have a good chance to catch-up to real-time (and this will combat
       * motion-sickness).
       *
       * but if the gap in being scheduled is because the CPU's running too hot
       * to keep up with demand: trying to catch-up the lost time only worsens the problem;
       * better failure mode is to throttle the simulation (which will look like slow-mo).
       */
      iterations++
      computationTimeAccMs = performance.now() - beforePhysicsMs
      const avgComputationTimeMs = computationTimeAccMs / iterations
      const timeToSimulateAnother60thMs = computationTimeAccMs + avgComputationTimeMs
      // would computing another frame exceed our deadline?
      if (timeToSimulateAnother60thMs > physicsDeadlineMs) {
        // fine, go slow-motion instead
        // (gives CPU a chance to cool down)
        break
      }
    }

    onSimulationSpeedParams.percent = simulatedMs / elapsedMs * 100
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

    draw(getEffect(), elapsedMs)

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