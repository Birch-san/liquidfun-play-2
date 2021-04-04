import http from 'http'
import serveStatic from 'serve-static'
import finalhandler from 'finalhandler'

const setHeaders = (res: http.ServerResponse, path: string, stat: unknown): any => {
  // if (mime.lookup(path) === 'application/wasm') {
  if (path.endsWith('.wasm')) {
    res.setHeader('Content-Type', 'application/wasm')
  }
}

const serve: serveStatic.RequestHandler<http.ServerResponse> = serveStatic('../../build', {
  index: 'index.html',
  setHeaders
})

const server: http.Server = http.createServer((req, res) =>
  serve(req, res, () => finalhandler(req, res))
)

// Listen
server.listen(3000)