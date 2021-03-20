export interface Data {
  message: string
}

const data: Data = {
  message: 'heyo'
}

self.postMessage(data)