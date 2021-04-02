import type { Demo } from '../../common/protocol'

export type ChangeDemo = (demo: Demo) => void
export type StrategyDestroy = () => void
export interface Strategy {
  destroy: StrategyDestroy
  changeDemo: ChangeDemo
}

export type SetFatalError = (message: string) => void
export interface StrategyStartOptions {
  setFatalError: SetFatalError
  canvasElement: HTMLCanvasElement
  initialDemo: Demo
}
export type StrategyStart = (options: StrategyStartOptions) => Strategy