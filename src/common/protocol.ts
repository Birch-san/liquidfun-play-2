export enum Demo {
  Ramp = 'Ramp',
  WaveMachine = 'WaveMachine',
  None = 'None'
}

interface AbstractFromMain<T extends string> {
  type: T
}
export interface CanvasFromMain extends AbstractFromMain<'offscreenCanvas'> {
  offscreenCanvas: OffscreenCanvas
}
export interface SwitchDemo extends AbstractFromMain<'switchDemo'> {
  demo: Demo
}
export type FromMain = CanvasFromMain | SwitchDemo

interface AbstractFromWorker<T extends string> {
  type: T
}
export interface ReadyFromWorker extends AbstractFromWorker<'ready'> {
}
export type FromWorker = ReadyFromWorker