import { growableQuadIndexArray } from './growableTypedArray'
import type { DrawBuffer } from './debugDraw'
import { mat3 } from 'gl-matrix'

const getShaderSource = async (name: string): Promise<string> => {
  const shaderResponse: Response = await fetch(new URL(`../../${name}`, import.meta.url).toString())
  return await shaderResponse.text()
}
const getFragmentShaderSource = async (name: string): Promise<string> =>
  await getShaderSource(`${name}.frag`)
const getVertexShaderSource = async (name: string): Promise<string> =>
  await getShaderSource(`${name}.vert`)

const shaderSources = {
  vertex: {
    general: await getVertexShaderSource('general'),
    circle: await getVertexShaderSource('circle')
  },
  fragment: {
    general: await getFragmentShaderSource('general'),
    circle: await getFragmentShaderSource('circle')
  }
}

export type ShouldRun = (intervalMs: number) => boolean
export type MainLoop = (intervalMs: number) => void
export type GetDrawBuffer = () => DrawBuffer
export type FlushDrawBuffer = () => void
export type MutateMatrix = (out: mat3, canvasWidth: number, canvasHeight: number) => void

export const onContext = (
  gl: WebGL2RenderingContext,
  shouldRun: ShouldRun,
  mainLoop: MainLoop,
  getDrawBuffer: GetDrawBuffer,
  flushDrawBuffer: FlushDrawBuffer,
  mutateMatrix: MutateMatrix
): void => {
  const compile = (type: GLenum, shaderName: string, shaderSource: string): WebGLShader => {
    const shader: WebGLShader | null = gl.createShader(type)
    if (shader === null) {
      throw new Error('Failed to create WebGLShader')
    }
    gl.shaderSource(shader, shaderSource)
    gl.compileShader(shader)

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error: string | null = gl.getShaderInfoLog(shader)
      const shaderType: string | undefined = ({
        [WebGLRenderingContext.FRAGMENT_SHADER]: 'fragment',
        [WebGLRenderingContext.VERTEX_SHADER]: 'vertex'
      })[type]
      throw new Error(`Compilation of ${`${shaderType} ` ?? ''}shader '${shaderName}' failed${error == null ? '' : `: ${error}`}`)
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

  const compileShaders = <T extends Record<string, string>> (type: GLenum, sources: T): { [K in keyof T]: WebGLShader } =>
    Object.fromEntries(
      Object.entries(sources)
        .map(([name, source]: [string, string]): [string, WebGLShader] =>
          [name, compile(type, name, source)]
        )
    ) as { [K in keyof T]: WebGLShader }

  const compiledShaders = {
    fragment: compileShaders(WebGLRenderingContext.FRAGMENT_SHADER, shaderSources.fragment),
    vertex: compileShaders(WebGLRenderingContext.VERTEX_SHADER, shaderSources.vertex)
  }

  const programs = {
    general: link([compiledShaders.vertex.general, compiledShaders.fragment.general]),
    circle: link([compiledShaders.vertex.circle, compiledShaders.fragment.circle])
  }

  gl.useProgram(programs.general)

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

  const mat: mat3 = mat3.create()

  const updateMatrix = (): void => {
    const { identity } = mat3
    identity(mat)
    mutateMatrix(mat, gl.canvas.width, gl.canvas.height)
  }

  const draw = (): void => {
    const drawBuffer: DrawBuffer = getDrawBuffer()
    const { boxes, lineVertices, circles } = drawBuffer

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

    const circleBuffer: WebGLBuffer = initBuffer(gl.ARRAY_BUFFER, circles.centres.getView())

    const positionAttr = gl.getAttribLocation(programs.general, 'a_position')
    if (positionAttr === -1) {
      throw new Error("Failed to find attribute 'a_position'")
    }

    const matrixAttr = gl.getUniformLocation(programs.general, 'u_matrix')
    if (matrixAttr === -1) {
      throw new Error("Failed to find attribute 'u_matrix'")
    }
    updateMatrix()
    gl.uniformMatrix3fv(matrixAttr, false, mat)

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

    if (circles.centres.length > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer)
      gl.vertexAttribPointer(positionAttr, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(positionAttr)
      gl.drawArrays(gl.POINTS, 0, circles.centres.length)
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