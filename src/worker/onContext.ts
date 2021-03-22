import { growableQuadArray, growableQuadIndexArray, growableLineArray } from './growableTypedArray'
import type { DebugDrawBuffer } from './debugDraw'
import type { M3 } from './m3'
import * as m3 from './m3'

const vertexShaderResponse: Response = await fetch(new URL('../../shader.vert', import.meta.url).toString())
const vertexShaderText: string = await vertexShaderResponse.text()

const fragmentShaderResponse: Response = await fetch(new URL('../../shader.frag', import.meta.url).toString())
const fragmentShaderText: string = await fragmentShaderResponse.text()

const pixelsPerMeter = 32

export type MainLoop = (intervalMs: number) => void
export type GetDrawBuffer = () => DebugDrawBuffer
export type FlushDrawBuffer = () => void

export const onContext = (
  gl: WebGL2RenderingContext,
  mainLoop: MainLoop,
  getDrawBuffer: GetDrawBuffer,
  flushDrawBuffer: FlushDrawBuffer,
  frameLimit: number
): void => {
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
    gl.bindBuffer(target, null)
    return buffer
  }

  const calculateMatrix = (): M3 => {
    const { translation, scaling, multiply } = m3
    // Compute the matrices
    const translationMatrix = translation(
      -gl.canvas.width / 2 / pixelsPerMeter,
      -gl.canvas.height / 2 / pixelsPerMeter
    )
    const scaleMatrix = scaling(
      1 / (gl.canvas.width / 2 / pixelsPerMeter),
      -1 / (gl.canvas.height / 2 / pixelsPerMeter)
    )

    // Multiply the matrices.
    return multiply(scaleMatrix, translationMatrix)
  }
  const matrix: M3 = calculateMatrix()

  const draw = (): void => {
    // this flush beforehand is defensive, but I don't mind because it's cheap
    flushDrawBuffer()
    const drawBuffer = getDrawBuffer()
    const { boxes, lines } = drawBuffer

    const quadVertices = 4

    growableQuadArray.ensureLength(boxes.length)
    const quadArray: Float32Array = growableQuadArray.getSlice(boxes.length)
    {
      const coordFloats = 2
      const quadFloats = quadVertices * coordFloats
      let offset = 0
      for (const box of boxes) {
        quadArray.set(box, offset)
        offset += quadFloats
      }
    }

    const vertexBuffer: WebGLBuffer = initBuffer(gl.ARRAY_BUFFER, quadArray)

    const quadOfTrisVertices = 6
    growableQuadIndexArray.ensureLength(boxes.length)
    const indexArray: Uint16Array = growableQuadIndexArray.getSlice(boxes.length)
    for (let boxIx = 0; boxIx < boxes.length; boxIx++) {
      const minVertexIx = boxIx * quadVertices
      const indexOffset = boxIx * quadOfTrisVertices
      indexArray[indexOffset] = 0 + minVertexIx
      indexArray[indexOffset + 1] = 1 + minVertexIx
      indexArray[indexOffset + 2] = 2 + minVertexIx
      indexArray[indexOffset + 3] = 0 + minVertexIx
      indexArray[indexOffset + 4] = 2 + minVertexIx
      indexArray[indexOffset + 5] = 3 + minVertexIx
    }
    const indexBuffer: WebGLBuffer = initBuffer(gl.ELEMENT_ARRAY_BUFFER, indexArray)

    growableLineArray.ensureLength(lines.length)
    const lineArray: Float32Array = growableLineArray.getSlice(lines.length)
    {
      const floatsPerVec2 = 2
      const vec2PerLine = 2
      const floatsPerLine = floatsPerVec2 * vec2PerLine
      let offset = 0
      for (const line of lines) {
        lineArray.set(line, offset)
        offset += floatsPerLine
      }
    }
    const lineBuffer: WebGLBuffer = initBuffer(gl.ARRAY_BUFFER, lineArray)

    flushDrawBuffer()

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)

    const positionAttr = gl.getAttribLocation(program, 'a_position')
    // https://webglfundamentals.org/webgl/lessons/webgl-2d-matrices.html
    gl.vertexAttribPointer(positionAttr, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(positionAttr)

    const matrixAttr = gl.getUniformLocation(program, 'u_matrix')
    gl.uniformMatrix3fv(matrixAttr, false, matrix)

    gl.clearColor(0.5, 0.5, 0.5, 0.9)
    // gl.enable(gl.DEPTH_TEST)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    // gl.drawArrays(gl.TRIANGLES, 0, 3)
    gl.drawElements(gl.TRIANGLES, indexArray.length, gl.UNSIGNED_SHORT, 0)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer)
    gl.drawArrays(gl.LINES, 0, lineArray.length)
  }

  const minimumWaitMs = 1 / frameLimit * 1000
  let lastRender: number = self.performance.now()

  const render: FrameRequestCallback = (): void => {
    const now: number = self.performance.now()
    const intervalMs: number = now - lastRender
    if (intervalMs > minimumWaitMs) {
      mainLoop(intervalMs)
      lastRender = now
      draw()
    }
    requestAnimationFrame(render)
  }
  requestAnimationFrame(render)
}