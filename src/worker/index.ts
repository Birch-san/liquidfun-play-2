import type { FromMain, ReadyFromWorker } from '../protocol'

self.onmessageerror = (event: MessageEvent) =>
  console.error('onmessageerror', event)
self.onerror = (event: ErrorEvent) =>
  console.error('onerror', event)

const vertexShaderResponse: Response = await fetch(new URL('../../shader.vert', import.meta.url).toString())
const vertexShaderText: string = await vertexShaderResponse.text()

const fragmentShaderResponse: Response = await fetch(new URL('../../shader.frag', import.meta.url).toString())
const fragmentShaderText: string = await fragmentShaderResponse.text()

const { box2D } = await import('./box2d')
const { debugDraw } = await import('./debugDraw')

const {
  b2_dynamicBody,
  b2BodyDef,
  b2Vec2,
  b2PolygonShape,
  b2World,
  destroy
} = box2D

const gravity = new b2Vec2(0, 10)
const world = new b2World(gravity)
destroy(gravity)

world.SetDebugDraw(debugDraw)

const sideLengthMetres = 1
const square = new b2PolygonShape()
square.SetAsBox(sideLengthMetres / 2, sideLengthMetres / 2)

const zero = new b2Vec2(0, 0)

const bd = new b2BodyDef()
bd.set_type(b2_dynamicBody)
bd.set_position(zero)

const body = world.CreateBody(bd)
body.CreateFixture(square, 1)
body.SetTransform(zero, 0)
body.SetLinearVelocity(zero)
body.SetAwake(true)
body.SetEnabled(true)
destroy(bd)

let renderedThisFrame = false
const physicsIntervalMs = 1 / 1 * 1000

setInterval(() => {
  world.Step(physicsIntervalMs, 1, 1, 1)
  renderedThisFrame = false
}, physicsIntervalMs)

const onContext = (gl: WebGL2RenderingContext): void => {
  const compile = (type: GLenum, shaderStr: string): WebGLShader => {
    const shader: WebGLShader | null = gl.createShader(type)
    if (shader === null) {
      throw new Error('Failed to create WebGLShader')
    }
    gl.shaderSource(shader, shaderStr)
    gl.compileShader(shader)

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error: string | null = gl.getShaderInfoLog(shader)
      throw new Error(`Shader compilation failed${error == null ? '' : `: ${error}`}`)
    }
    return shader
  }
  const link = (shaders: WebGLShader[]): WebGLProgram => {
    const program: WebGLProgram | null = gl.createProgram()
    if (program === null) {
      throw new Error('Failed to create WebGLProgram')
    }
    for (const shader of shaders) {
      gl.attachShader(program, shader)
    }
    gl.linkProgram(program)

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error: string | null = gl.getProgramInfoLog(program)
      throw new Error(`WebGL program link failed${error == null ? '' : `: ${error}`}`)
    }

    return program
  }

  const vertexShader: WebGLShader = compile(WebGLRenderingContext.VERTEX_SHADER, vertexShaderText)
  const fragmentShader: WebGLShader = compile(WebGLRenderingContext.FRAGMENT_SHADER, fragmentShaderText)

  const program: WebGLProgram = link([vertexShader, fragmentShader])

  gl.useProgram(program)

  const initBuffer = (target: GLenum, data: BufferSource): WebGLBuffer => {
    const buffer: WebGLBuffer | null = gl.createBuffer()
    if (buffer === null) {
      throw new Error('Failed to create WebGLBuffer')
    }
    gl.bindBuffer(target, buffer)
    gl.bufferData(target, data, gl.STATIC_DRAW)
    // gl.vertexAttribPointer()
    gl.bindBuffer(target, null)
    return buffer
  }

  const draw = (): void => {
    // const vertices: number[] = [-0.5, 0.5, -0.5, -0.5, 0.0, -0.5]

    const vertices: number[] = [
      -0.5, 0.5,
      -0.5, -0.5,
      0.5, -0.5,
      0.5, 0.5
    ]
    const vertexBuffer: WebGLBuffer = initBuffer(gl.ARRAY_BUFFER, new Float32Array(vertices))

    const indices: number[] = [3, 2, 1, 3, 1, 0]
    const indexBuffer: WebGLBuffer = initBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices))

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)

    const coord = gl.getAttribLocation(program, 'coordinates')
    gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(coord)

    gl.clearColor(0.5, 0.5, 0.5, 0.9)
    gl.enable(gl.DEPTH_TEST)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    // gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0)

    // world.DebugDraw()
  }

  const render: FrameRequestCallback = (): void => {
    if (!renderedThisFrame) {
      draw()
      renderedThisFrame = true
    }
    requestAnimationFrame(render)
  }
  requestAnimationFrame(render)
}

self.onmessage = ({ data }: MessageEvent<FromMain>) => {
  if (data.type === 'offscreenCanvas') {
    const gl: WebGL2RenderingContext | null = data.offscreenCanvas.getContext('webgl2')
    if (gl === null) {
      throw new Error('Failed to create WebGL2 rendering context')
    }
    onContext(gl)
  }
}

const data: ReadyFromWorker = {
  type: 'ready'
}
self.postMessage(data)