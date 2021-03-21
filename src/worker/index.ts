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
  b2EdgeShape,
  b2Vec2,
  b2PolygonShape,
  b2World,
  destroy
} = box2D

const pixelsPerMeter = 32
const gravity = new b2Vec2(0, 10)
const world = new b2World(gravity)
destroy(gravity)

world.SetDebugDraw(debugDraw)

{
  const from = new b2Vec2(3, 4)
  const to = new b2Vec2(6, 7)
  const bd_ground = new b2BodyDef()
  const ground = world.CreateBody(bd_ground)
  // ramp which boxes fall onto initially
  {
    const shape = new b2EdgeShape()
    shape.SetTwoSided(from, to)
    ground.CreateFixture(shape, 0)
  }
  // floor which boxes rest on
  {
    from.Set(3, 18)
    to.Set(22, 18)
    const shape = new b2EdgeShape()
    shape.SetTwoSided(from, to)
    ground.CreateFixture(shape, 0)
  }
  destroy(bd_ground)
  destroy(from)
  destroy(to)
}

{
  const sideLengthMetres = 1
  const square = new b2PolygonShape()
  square.SetAsBox(sideLengthMetres / 2, sideLengthMetres / 2)

  const zero = new b2Vec2(0, 0)
  const temp = new b2Vec2(0, 0)

  const initPosition = (body: Box2D.b2Body, index: number): void => {
    temp.Set(4 + sideLengthMetres * (Math.random() - 0.5), -sideLengthMetres * index)
    body.SetTransform(temp, 0)
    body.SetLinearVelocity(zero)
    body.SetAwake(true)
    body.SetEnabled(true)
  }

  const bd = new b2BodyDef()
  bd.set_type(b2_dynamicBody)
  bd.set_position(zero)

  // make falling boxes
  const boxCount = 2
  for (let i = 0; i < boxCount; i++) {
    const body = world.CreateBody(bd)
    body.CreateFixture(square, 1)
    initPosition(body, i)
  }

  // const bd = new b2BodyDef()
  // bd.set_type(b2_dynamicBody)
  // bd.set_position(zero)

  // const body = world.CreateBody(bd)
  // body.CreateFixture(square, 1)
  // body.SetTransform(zero, 0)
  // body.SetLinearVelocity(zero)
  // body.SetAwake(true)
  // body.SetEnabled(true)
  destroy(bd)
  destroy(zero)
  destroy(temp)
}

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

    // const floatCount = boxes.reduce<number>((acc, { length }) => acc + length, 0)
    const quadOfTrisVertices = 6
    const quadVertices = 4
    const coordFloats = 2
    const quadFloats = quadVertices * coordFloats
    const buffer = new Float32Array(boxes.length * quadFloats)
    let offset = 0
    for (const box of boxes) {
      buffer.set(box, offset)
      offset += quadFloats
    }
    // console.log(buffer)

    const vertexBuffer: WebGLBuffer = initBuffer(gl.ARRAY_BUFFER, buffer)

    // const indices: number[] = boxes.reduce<number[]>(() => {

    // }, []) [3, 2, 1, 3, 1, 0]
    const indexArray = new Uint16Array(boxes.length * 6)
    for (let boxIx = 0; boxIx < boxes.length; boxIx++) {
      const minVertexIx = boxIx * quadVertices
      // const minVertexIx = 0
      const indexOffset = boxIx * quadOfTrisVertices
      indexArray[indexOffset] = 0 + minVertexIx
      indexArray[indexOffset + 1] = 1 + minVertexIx
      indexArray[indexOffset + 2] = 2 + minVertexIx
      indexArray[indexOffset + 3] = 0 + minVertexIx
      indexArray[indexOffset + 4] = 2 + minVertexIx
      indexArray[indexOffset + 5] = 3 + minVertexIx
    }
    const indexBuffer: WebGLBuffer = initBuffer(gl.ELEMENT_ARRAY_BUFFER, indexArray)
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
        -gl.canvas.width / 2 / pixelsPerMeter,
        -gl.canvas.height / 2 / pixelsPerMeter
      )
      const scaleMatrix = scaling(
        1 / (gl.canvas.width / 2 / pixelsPerMeter),
        -1 / (gl.canvas.height / 2 / pixelsPerMeter)
      )

      // Multiply the matrices.
      const matrix: M3 = multiply(scaleMatrix, translationMatrix)

      // Set the matrix.
      gl.uniformMatrix3fv(matrixAttr, false, matrix)
    }

    gl.clearColor(0.5, 0.5, 0.5, 0.9)
    // gl.enable(gl.DEPTH_TEST)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    // gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.drawElements(gl.TRIANGLES, indexArray.length, gl.UNSIGNED_SHORT, 0)
  }

  let lastRender: number = self.performance.now()

  const render: FrameRequestCallback = (): void => {
    const now: number = self.performance.now()
    const intervalMs: number = now - lastRender
    world.Step(intervalMs / 1000, 1, 1, 1)
    lastRender = now
    draw()
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