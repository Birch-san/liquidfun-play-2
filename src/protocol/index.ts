export interface FromMainThread {
  message: 'please render'
}

export interface FromWorker {
  message: 'ready'
}