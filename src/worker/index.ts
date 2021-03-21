import type { FromMain, ReadyFromWorker } from '../protocol'
import { debugDrawBuffer, flushDebugDrawBuffer } from './debugDraw'
import type { M3 } from './m3'
import * as m3 from './m3'

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

const pixelsPerMeter = 32
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
destroy(zero)

let renderedThisFrame = false
const physicsIntervalMs = 1 / 6 * 1000

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
    flushDebugDrawBuffer()
    world.DebugDraw()
    const { boxes } = debugDrawBuffer

    const floatCount = boxes.reduce<number>((acc, { length }) => acc + length, 0)
    const buffer = new Float32Array(floatCount)
    let offset = 0
    for (const box of boxes) {
      buffer.set(box, offset)
      offset += box.length
    }
    // console.log(buffer)

    const vertexBuffer: WebGLBuffer = initBuffer(gl.ARRAY_BUFFER, buffer)

    const indices: number[] = [3, 2, 1, 3, 1, 0]
    const indexBuffer: WebGLBuffer = initBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices))
    flushDebugDrawBuffer()

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)

    const positionAttr = gl.getAttribLocation(program, 'a_position')
    // https://webglfundamentals.org/webgl/lessons/webgl-2d-matrices.html
    gl.vertexAttribPointer(positionAttr, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(positionAttr)

    {
      const { translation, scaling, multiply } = m3
      // Compute the matrices
      const matrixAttr = gl.getUniformLocation(program, 'u_matrix')
      const translationMatrix = translation(
        gl.canvas.width / 2 / pixelsPerMeter,
        -gl.canvas.height / 2 / pixelsPerMeter
      )
      const scaleMatrix = scaling(
        -1 / (gl.canvas.width / 2 / pixelsPerMeter),
        -1 / (gl.canvas.height / 2 / pixelsPerMeter)
      )

      // Multiply the matrices.
      const matrix: M3 = multiply(scaleMatrix, translationMatrix)

      // Set the matrix.
      gl.uniformMatrix3fv(matrixAttr, false, matrix)
    }

    gl.clearColor(0.5, 0.5, 0.5, 0.9)
    gl.enable(gl.DEPTH_TEST)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    // gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0)
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