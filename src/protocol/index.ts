interface AbstractFromMain<T extends string> {
  type: T
}
export interface CanvasFromMain extends AbstractFromMain<'offscreenCanvas'> {
  offscreenCanvas: OffscreenCanvas
}
export type FromMain = CanvasFromMain

interface AbstractFromWorker<T extends string> {
  type: T
}
export interface ReadyFromWorker extends AbstractFromWorker<'ready'> {
}
export type FromWorker = ReadyFromWorker