import { dirname, resolve } from 'path'
import express from 'express'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

const repoRoot = resolve(__dirname, '..')

const app = express()
app.use(express.static(resolve(repoRoot, 'build-local')))
// seems to resolve to UMD but whatever; it's only WASM we're trying to serve from that folder
app.use('/box2d-wasm', express.static(dirname(require.resolve('box2d-wasm'))))

const port = 3000
app.listen(port, () => {
  console.log('now listening on port', port)
})