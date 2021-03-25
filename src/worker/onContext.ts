import { growableQuadIndexArray } from './growableTypedArray'
import type { DrawBuffer } from './debugDraw'
import type { M3 } from './m3'
import * as m3 from './m3'

const vertexShaderResponse: Response = await fetch(new URL('../../shader.vert', import.meta.url).toString())
const vertexShaderText: string = await vertexShaderResponse.text()

const fragmentShaderResponse: Response = await fetch(new URL('../../shader.frag', import.meta.url).toString())
const fragmentShaderText: string = await fragmentShaderResponse.text()

const pixelsPerMeter = 32

export type ShouldRun = (intervalMs: number) => boolean
export type MainLoop = (intervalMs: number) => void
export type GetDrawBuffer = () => DrawBuffer
export type FlushDrawBuffer = () => void

export const onContext = (
  gl: WebGL2RenderingContext,
  shouldRun: ShouldRun,
  mainLoop: MainLoop,
  getDrawBuffer: GetDrawBuffer,
  flushDrawBuffer: FlushDrawBuffer
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
    const drawBuffer: DrawBuffer = getDrawBuffer()
    const { boxes, lineVertices } = drawBuffer

    const vertexBuffer: WebGLBuffer = initBuffer(gl.ARRAY_BUFFER, boxes.getView())

    const quadVertices = 4
    growableQuadIndexArray.ensureFits(boxes.length)
    for (let quadIx = 0; quadIx < boxes.length; quadIx++) {
      const minVertexIx = quadIx * quadVertices
      growableQuadIndexArray.emplaceWithoutRealloc(
        0 + minVertexIx,
        1 + minVertexIx,
        2 + minVertexIx,
        0 + minVertexIx,
        2 + minVertexIx,
        3 + minVertexIx
      )
    }
    const indexBuffer: WebGLBuffer = initBuffer(gl.ELEMENT_ARRAY_BUFFER, growableQuadIndexArray.getView())

    const lineBuffer: WebGLBuffer = initBuffer(gl.ARRAY_BUFFER, lineVertices.getView())

    const positionAttr = gl.getAttribLocation(program, 'a_position')
    if (positionAttr === -1) {
      throw new Error("Failed to find attribute 'a_position'")
    }

    const matrixAttr = gl.getUniformLocation(program, 'u_matrix')
    if (matrixAttr === -1) {
      throw new Error("Failed to find attribute 'u_matrix'")
    }
    gl.uniformMatrix3fv(matrixAttr, false, matrix)

    gl.clearColor(0.5, 0.5, 0.5, 0.9)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    if (growableQuadIndexArray.length > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
      gl.vertexAttribPointer(positionAttr, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(positionAttr)
      gl.drawElements(gl.TRIANGLES, growableQuadIndexArray.length * growableQuadIndexArray.elemSize, gl.UNSIGNED_SHORT, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
    }

    if (lineVertices.length > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer)
      gl.vertexAttribPointer(positionAttr, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(positionAttr)
      gl.drawArrays(gl.LINES, 0, lineVertices.length)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }

    flushDrawBuffer()
    growableQuadIndexArray.length = 0
  }

  let lastRender: number = self.performance.now()

  const render: FrameRequestCallback = (): void => {
    const now: number = self.performance.now()
    const intervalMs: number = now - lastRender
    if (shouldRun(intervalMs)) {
      mainLoop(intervalMs)
      lastRender = now
      draw()
    }
    requestAnimationFrame(render)
  }
  requestAnimationFrame(render)
}