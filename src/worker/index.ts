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

const onContext = (ctx: WebGLRenderingContext): void => {
  const compile = (type: GLenum, shaderStr: string): WebGLShader => {
    const shader: WebGLShader | null = ctx.createShader(type)
    if (shader === null) {
      throw new Error('Failed to create WebGLShader')
    }
    ctx.shaderSource(shader, shaderStr)
    ctx.compileShader(shader)

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!ctx.getShaderParameter(shader, ctx.COMPILE_STATUS)) {
      const error: string | null = ctx.getShaderInfoLog(shader)
      throw new Error(`Shader compilation failed${error == null ? '' : `: ${error}`}`)
    }
    return shader
  }
  const link = (shaders: WebGLShader[]): WebGLProgram => {
    const program: WebGLProgram | null = ctx.createProgram()
    if (program === null) {
      throw new Error('Failed to create WebGLProgram')
    }
    for (const shader of shaders) {
      ctx.attachShader(program, shader)
    }
    ctx.linkProgram(program)

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!ctx.getProgramParameter(program, ctx.LINK_STATUS)) {
      const error: string | null = ctx.getProgramInfoLog(program)
      throw new Error(`WebGL program link failed${error == null ? '' : `: ${error}`}`)
    }

    return program
  }

  const vertexShader: WebGLShader = compile(WebGLRenderingContext.VERTEX_SHADER, vertexShaderText)
  const fragmentShader: WebGLShader = compile(WebGLRenderingContext.FRAGMENT_SHADER, fragmentShaderText)

  const program: WebGLProgram = link([vertexShader, fragmentShader])

  ctx.useProgram(program)

  const draw = (): void => {
    // const n = 0
    ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT)

    world.DebugDraw()
    // ctx.drawArrays(ctx.TRIANGLES, 0, n)
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
    const ctx: WebGLRenderingContext | null = data.offscreenCanvas.getContext('webgl')
    if (ctx === null) {
      throw new Error('Failed to create WebGL2 rendering context')
    }
    onContext(ctx)
  }
}

const data: ReadyFromWorker = {
  type: 'ready'
}
self.postMessage(data)