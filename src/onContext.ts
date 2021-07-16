import { growableQuadIndexArray } from './growableTypedArray'
import type { CircleBuffers, DrawBuffer } from './debugDraw'
import { mat3, vec4 } from 'gl-matrix'

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
    blob: await getVertexShaderSource('blob'),
    blobfullscreen: await getVertexShaderSource('blobfullscreen'),
    color: await getVertexShaderSource('color'),
    fullscreen: await getVertexShaderSource('fullscreen'),
    point: await getVertexShaderSource('point'),
    texture: await getVertexShaderSource('texture'),
    general: await getVertexShaderSource('general'),
    circle: await getVertexShaderSource('circle')
  },
  fragment: {
    blob: await getFragmentShaderSource('blob'),
    blobfullscreen: await getFragmentShaderSource('blobfullscreen'),
    color: await getFragmentShaderSource('color'),
    fullscreen: await getFragmentShaderSource('fullscreen'),
    point: await getFragmentShaderSource('point'),
    texture: await getFragmentShaderSource('texture'),
    general: await getFragmentShaderSource('general'),
    circle: await getFragmentShaderSource('circle')
  }
}

export type GetDrawBuffer = () => DrawBuffer
export type FlushDrawBuffer = () => void
export type MutateMatrix = (out: mat3, canvasWidth: number, canvasHeight: number) => void
export type GetPixelsPerMeter = () => number
export type Draw = (frameDeltaMs: number) => void

export interface OnContextParams {
  gl: WebGLRenderingContext | WebGL2RenderingContext
  getDrawBuffer: GetDrawBuffer
  flushDrawBuffer: FlushDrawBuffer
  mutateMatrix: MutateMatrix
  getPixelsPerMeter: GetPixelsPerMeter
}

/*
 * Some sections of this code pertaining to water shading were ported to TypeScript from
 * LiquidFun's C++ EyeCandy demo.
 * https://github.com/google/liquidfun/blob/master/liquidfun/Box2D/EyeCandy/engine.cpp
 *
 * Those sections have the following copyright:
 * Copyright (c) 2013 Google, Inc.
 *
 * This software is provided 'as-is', without any express or implied
 * warranty.  In no event will the authors be held liable for any damages
 * arising from the use of this software.
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 * 1. The origin of this software must not be misrepresented; you must not
 * claim that you wrote the original software. If you use this software
 * in a product, an acknowledgment in the product documentation would be
 * appreciated but is not required.
 * 2. Altered source versions must be plainly marked as such, and must not be
 * misrepresented as being the original software.
 * 3. This notice may not be removed or altered from any source distribution.
 */
export const onContext = ({
  gl,
  getDrawBuffer,
  flushDrawBuffer,
  mutateMatrix,
  getPixelsPerMeter
}: OnContextParams): Draw => {
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
    blob: link([compiledShaders.vertex.blob, compiledShaders.fragment.blob]),
    blobfullscreen: link([compiledShaders.vertex.blobfullscreen, compiledShaders.fragment.blobfullscreen]),
    color: link([compiledShaders.vertex.color, compiledShaders.fragment.color]),
    fullscreen: link([compiledShaders.vertex.fullscreen, compiledShaders.fragment.fullscreen]),
    point: link([compiledShaders.vertex.point, compiledShaders.fragment.point]),
    texture: link([compiledShaders.vertex.texture, compiledShaders.fragment.texture]),
    general: link([compiledShaders.vertex.general, compiledShaders.fragment.general]),
    circle: link([compiledShaders.vertex.circle, compiledShaders.fragment.circle])
  }

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

  const getAttribLocation = (programName: keyof typeof programs, name: string): GLint => {
    const attribLoc = gl.getAttribLocation(programs[programName], name)
    if (attribLoc === -1) {
      throw new Error(`Failed to find attribute '${name}' for program '${programName}'`)
    }
    return attribLoc
  }

  const getUniformLocation = (programName: keyof typeof programs, name: string): WebGLUniformLocation => {
    const uniformLoc: WebGLUniformLocation | null = gl.getUniformLocation(programs[programName], name)
    if (uniformLoc === -1 || uniformLoc === null) {
      throw new Error(`Failed to find uniform '${name}' for program '${programName}'`)
    }
    return uniformLoc
  }

  interface UnresolvedLocations<Attrib extends readonly string[], Uniform extends readonly string[]> {
    attrib: Attrib
    uniform: Uniform
  }
  interface Locations<Attrib extends readonly string[], Uniform extends readonly string[]> {
    attrib: Record<Attrib[number], GLint>
    uniform: Record<Uniform[number], WebGLUniformLocation>
  }
  const getLocationsForProgram = <Attrib extends readonly string[], Uniform extends readonly string[]>(
    programName: keyof typeof programs,
    { attrib, uniform }: UnresolvedLocations<Attrib, Uniform>
  ): Locations<Attrib, Uniform> =>
      ({
        attrib: Object.fromEntries(
          attrib.map((name: string): [string, GLint] =>
            [name, getAttribLocation(programName, name)]
          )
        ) as Record<Attrib[number], GLint>,
        uniform: Object.fromEntries(
          uniform.map((name: string): [string, WebGLUniformLocation] =>
            [name, getUniformLocation(programName, name)]
          )
        ) as Record<Uniform[number], WebGLUniformLocation>
      })
  const getLocations = <T extends Record<keyof typeof programs, UnresolvedLocations<unknown & readonly string[], unknown & readonly string[]>>>(
    programsToLocations: T
  ): { [K in keyof typeof programs]: Locations<T[K]['attrib'], T[K]['uniform']> } =>
      Object.fromEntries(
        Object.entries(programsToLocations).map(
          <Attrib extends readonly string[], Uniform extends readonly string[]>(
            [programName, unresolvedLocations]: [string, UnresolvedLocations<Attrib, Uniform>]
          ): [string, Locations<Attrib, Uniform>] =>
            [programName, getLocationsForProgram(programName as keyof typeof programs, unresolvedLocations)]
        )
      ) as { [K in keyof typeof programs]: Locations<T[K]['attrib'], T[K]['uniform']> }

  const locations = getLocations({
    blob: {
      attrib: ['position', 'particlesize'] as const,
      uniform: ['extents', 'scale'] as const
    },
    blobfullscreen: {
      attrib: ['position'] as const,
      uniform: [] as const
    },
    color: {
      attrib: ['position'] as const,
      uniform: ['extents', 'color'] as const
    },
    fullscreen: {
      attrib: ['position'] as const,
      uniform: ['lightdir'] as const
    },
    point: {
      attrib: ['position', 'particlesize'] as const,
      uniform: ['extents', 'scale'] as const
    },
    texture: {
      attrib: [] as const,
      uniform: [] as const
    },
    general: {
      attrib: ['a_position'] as const,
      uniform: ['u_matrix'] as const
    },
    circle: {
      attrib: ['a_position'] as const,
      uniform: ['u_matrix', 'u_color', 'u_diameter', 'u_edge_size', 'u_edge_color'] as const
    }
  })

  const createTexture = (
    width: number,
    height: number,
    pixels: ArrayBufferView | null,
    clamp: boolean,
    nearestfiltering: boolean,
    generatemipmaps: boolean
  ): WebGLTexture => {
    const tex: WebGLTexture | null = gl.createTexture()
    if (tex === null) {
      throw new Error('Failed to create WebGLFramebuffer')
    }
    gl.enable(gl.TEXTURE_2D)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    const clval: GLenum = clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, clval)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, clval)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, nearestfiltering ? gl.NEAREST : gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearestfiltering
      ? (generatemipmaps ? gl.NEAREST_MIPMAP_NEAREST : gl.NEAREST)
      : (generatemipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR))
    if (generatemipmaps) {
      gl.generateMipmap(gl.TEXTURE_2D)
    }
    gl.bindTexture(gl.TEXTURE_2D, tex)
    return tex
  }

  const saturate = (x: number): number =>
    Math.max(Math.min(x, 1), 0)

  const smoothstep = (x: number): number => {
    const y = saturate(x)
    return y ** 2 * (3 - 2 * y)
  }

  const quantize = (x: number): number =>
    saturate(x) * 255

  enum Effect {
    TemporalBlend,
    Refraction,
    None
  }

  class jsVec2 {
    constructor (
      public x: number,
      public y: number
    ) {
    }

    add (scalar: number): this {
      this.x += scalar
      this.y += scalar
      return this
    }

    div (scalar: number): this {
      this.x /= scalar
      this.y /= scalar
      return this
    }

    mul (scalar: number): this {
      this.x *= scalar
      this.y *= scalar
      return this
    }

    sub (scalar: number): this {
      this.x -= scalar
      this.y -= scalar
      return this
    }

    lengthSquared (): number {
      return this.x ** 2 + this.y ** 2
    }
  }

  class jsVec3 {
    constructor (
      public x: number,
      public y: number,
      public z: number
    ) {
    }

    length (): number {
      return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2)
    }

    normalize (): number {
      const length = this.length()
      if (length < Number.EPSILON) {
        return 0
      }
      const invLength = 1 / length
      this.x *= invLength
      this.y *= invLength
      this.z *= invLength

      return length
    }
  }

  class jsVec4 {
    constructor (
      public x: number,
      public y: number,
      public z: number,
      public w: number
    ) {
    }

    set (
      x: number,
      y: number,
      z: number,
      w: number
    ): this {
      this.x = x
      this.y = y
      this.z = z
      this.w = w
      return this
    }
  }

  const precomputeBlobTexture = (effect: Effect): WebGLTexture => {
    // This texture creates pre-computed parameters for each particle point
    // sprite to be blended into an FBO to later be used in the actual full
    // screen water shader.
    // We want to compute information that will allow us to have a blended
    // normal. This is tricky for a 2 reasons:
    // 1) Because we generally don't have floating point FBO's, we have to make
    //    sure to fit all the values within an 8-bit range, while taking into
    //    account up to 6 or so particles can blend for any pixel, which gives
    //    serious precision issues.
    // 2) To make the particles appear to smoothly transition into eachother
    //    as if they were a single liquid under additive blending we have to
    //    choose our math carefully.
    // For this reason, we cannot simply blend normals. Instead, we blend a
    // a directional vector and a fluid height each in their own way, and
    // reconstruct the normal later. This is also useful for the refraction
    // term.
    // Note: lower gives aliasing effects on high res
    // screens, higher degrades performance because of
    // texture cache.
    const TSIZE = 64
    const tex = new Uint8ClampedArray(TSIZE ** 2 * 4)
    for (let y = 0; y < TSIZE; y++) {
      for (let x = 0; x < TSIZE; x++) {
        // define our cone
        const xy: jsVec2 = new jsVec2(x, y).add(0.5).div(TSIZE / 2).sub(1)
        const distsqr: number = xy.lengthSquared()
        const falloff = 1 - distsqr
        const smooth = smoothstep(falloff) // outside circle drops to 0

        // the more we scale the distance for exp(), the more fluid the
        // transition looks, but also the more precision problems we cause on
        // the rim. 4 is a good tradeoff.
        // exp() works better than linear/smoothstep/hemisphere because it
        // makes the fluid transition nicer (less visible transition
        // boundaries).
        const waterheight = Math.exp(distsqr * -4)

        // this value represents the 0 point for the directional components
        // it needs to be fairly low to make sure we can fit many blended
        // samples (this depends on how "particlesize" for point.vs is
        // computed, the larger, the more overlapping particles, and we can't
        // allow them saturate to 1).
        // But, the lower, the more precision problems you get.
        const bias = 0.075

        // the w component effectively holds the number of particles that were
        // blended to this pixel, i.e. the total bias.
        // xy is the directional vector. we reduce the magnitude of this vector
        // by a smooth version of the distance from the center to reduce its
        // contribution to the blend, this works well because vectors at the
        // edges tend to have opposed directions, this keeps it smooth and sort
        // of normalizes (since longer vectors get reduced more) at the cost of
        // precision at the far ends.
        // The z component is the fluid height, and unlike the xy is meant to
        // saturate under blending.
        const falloff_min = 0.05
        const out = new jsVec4(0, 0, 0, 0)
        if (falloff > falloff_min) {
          if (effect === Effect.Refraction) {
            const { x, y } = xy
            const dxy = new jsVec2(x, y).mul(0.5 * smooth).add(bias)
            out.set(dxy.x, dxy.y, waterheight, bias)
          } else {
            out.set(
              0.05 * smooth,
              0.08 * smooth,
              0.30 * smooth,
              1
            )
          }
        }
        tex.set(
          new Uint8ClampedArray([
            quantize(out.x),
            quantize(out.y),
            quantize(out.z),
            quantize(out.w)
          ]),
          y * TSIZE + x
        )
        // See fullscreen.glslf (starting at vec4 samp) for how these values
        // are used.
      }
    }

    return createTexture(TSIZE, TSIZE, tex, true, false, false)
  }

  const drawUnitQuad = (positionHandle: number): void => {
    const unitquad = new Float32Array([
      -1, 1,
      -1, -1,
      1, -1,
      1, 1
    ])
    const buf: WebGLBuffer | null = gl.createBuffer()
    if (buf === null) {
      throw new Error('Failed to create WebGLBuffer')
    }
    // these are a guess
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, unitquad, gl.STATIC_DRAW)
    // probably stride could be Float32Array.BYTES_PER_ELEMENT or maybe multiply by 2 or by unitquad.length
    gl.vertexAttribPointer(positionHandle, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(positionHandle)
    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4)
    gl.disableVertexAttribArray(positionHandle)
  }

  const drawParticleBuffers = (
    positionHandle: number,
    particleSizeHandle: number,
    blobParticleSizeHandle: number,
    particlePositions: WebGLBuffer,
    particleSizes: WebGLBuffer,
    particleCount: number
  ): void => {
    gl.bindBuffer(gl.ARRAY_BUFFER, particlePositions)
    gl.vertexAttribPointer(positionHandle, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(positionHandle)

    gl.bindBuffer(gl.ARRAY_BUFFER, particleSizes)
    gl.vertexAttribPointer(particleSizeHandle, 1, gl.FLOAT, false, 0, 0)
    // is this mismatched particle size handle a mistake?
    gl.enableVertexAttribArray(blobParticleSizeHandle)

    gl.drawArrays(gl.POINTS, 0, particleCount)

    gl.disableVertexAttribArray(positionHandle)
    gl.disableVertexAttribArray(particleSizeHandle)
  }

  // is this related to pixelsPerMeter?
  const scale = gl.canvas.height / 12

  const normalsRefractEffect = (
    time: number,
    particlePositions: WebGLBuffer,
    particleSizes: WebGLBuffer,
    particleCount: number
  ): void => {
    // first pass: render particles to fbo_, according to point.ps
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE)

    gl.useProgram(programs.point)
    gl.uniform2f(locations.point.uniform.extents, gl.canvas.width / scale, gl.canvas.height / scale)
    gl.uniform1f(locations.point.uniform.scale, scale)
    gl.bindTexture(gl.TEXTURE_2D, blobNormalTex)
    drawParticleBuffers(
      locations.point.attrib.position,
      locations.point.attrib.particlesize,
      locations.blob.attrib.particlesize,
      particlePositions,
      particleSizes,
      particleCount
    )

    gl.disable(gl.BLEND)

    // second pass: render fbo_ as one quad to screen, apply final graphical
    // effects (see fulls.ps)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    gl.useProgram(programs.fullscreen)
    {
      const angle: number = Math.sin(time) - Math.PI / 2
      const lightdir = new jsVec3(Math.cos(angle), Math.sin(angle), 1)
      lightdir.normalize()
      const { x, y, z } = lightdir
      gl.uniform3fv(locations.fullscreen.uniform.lightdir, new Float32Array([x, y, z]))
    }
    gl.bindTexture(gl.TEXTURE_2D, fboTex)
    gl.activeTexture(gl.TEXTURE1)
    // gl.bindTexture(gl.TEXTURE_2D, background_tex_)
    // gl.activeTexture(gl.TEXTURE0)
    // DrawUnitQuad(sh_fulls_)
    gl.bindTexture(gl.TEXTURE_2D, null)
  }

  const temporalBlendEffect = (
    particlePositions: WebGLBuffer,
    particleSizes: WebGLBuffer,
    particleCount: number
  ): void => {
    // first pass:
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    // First, darken what's already in the framebuffer gently.
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ZERO, gl.SRC_ALPHA)

    gl.useProgram(programs.color)
    // gl.uniform2f(locations.color.uniform.extents, 1, 1)
    // gl.uniform1f(scale_handle, 1)
    gl.uniform2f(locations.color.uniform.extents, 1, 1)
    // Set the alpha to be the darkening multiplier.
    // Note how this value is hardcoded to look good assuming the device
    // hits 60fps or so, it was originally a value derived from frametime,
    // but then variances in frametime would give the effect of whole screen
    // "flickers" as things got instantly darker/brighter.
    // review this
    gl.uniform4fv(locations.color.uniform.color, new Float32Array([0, 0, 0, 0.85]))
    // sh_color_.Set4f('color', new jsVec4(0, 0, 0, 0.85))
    drawUnitQuad(locations.color.attrib.position)

    // Then render the particles on top of that.
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR)

    gl.useProgram(programs.blob)
    gl.uniform2f(locations.blob.uniform.extents, gl.canvas.width / scale, gl.canvas.height / scale)
    gl.uniform1f(locations.blob.uniform.scale, scale)
    gl.bindTexture(gl.TEXTURE_2D, blobTemporalTex)
    drawParticleBuffers(
      locations.blob.attrib.position,
      locations.blob.attrib.particlesize,
      locations.blob.attrib.particlesize,
      particlePositions,
      particleSizes,
      particleCount
    )

    gl.disable(gl.BLEND)

    // second pass:
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)

    // sh_blobfs.SetWorld(1, 1, 1)
    gl.useProgram(programs.blobfullscreen)
    gl.bindTexture(gl.TEXTURE_2D, fboTex)
    gl.activeTexture(gl.TEXTURE1)
    // gl.bindTexture(gl.TEXTURE_2D, background_tex_)
    // gl.activeTexture(gl.TEXTURE0)
    drawUnitQuad(locations.blobfullscreen.attrib.position)
    gl.bindTexture(gl.TEXTURE_2D, 0)
  }

  const noEffect = (circles: CircleBuffers, circleBuffer: WebGLBuffer): void => {
    const pixelsPerMeter = getPixelsPerMeter()
    const canvasToClipSpaceRatio = Math.max(mat[0], -mat[4])
    gl.useProgram(programs.circle)
    gl.uniform1f(locations.circle.uniform.u_diameter, 2 * circles.systemRadius * pixelsPerMeter * canvasToClipSpaceRatio)
    gl.uniform1f(locations.circle.uniform.u_edge_size, circleEdgeThicknessPx * canvasToClipSpaceRatio)
    gl.uniform4fv(locations.circle.uniform.u_edge_color, circleEdgeColor)
    gl.uniform4fv(locations.circle.uniform.u_color, circles.color)
    gl.uniformMatrix3fv(locations.circle.uniform.u_matrix, false, mat)
    gl.bindBuffer(gl.ARRAY_BUFFER, circleBuffer)
    gl.vertexAttribPointer(locations.general.attrib.a_position, 2, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(locations.general.attrib.a_position)
    gl.drawArrays(gl.POINTS, 0, circles.centres.length)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
  }

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  const fbo: WebGLFramebuffer | null = gl.createFramebuffer()
  if (fbo === null) {
    throw new Error('Failed to create WebGLFramebuffer')
  }

  const fboTex: WebGLTexture = createTexture(gl.canvas.width, gl.canvas.height, null, true, true, false)
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTex, 0)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  const blobNormalTex = precomputeBlobTexture(Effect.Refraction)
  const blobTemporalTex = precomputeBlobTexture(Effect.TemporalBlend)

  const circleEdgeColor: vec4 = vec4.fromValues(0, 0, 0, 0.2)
  const circleEdgeThicknessPx = 1

  const effect = Effect.None as Effect
  let totalMs = 0

  const draw: Draw = (frameDeltaMs: number): void => {
    totalMs += frameDeltaMs
    const drawBuffer: DrawBuffer = getDrawBuffer()
    const { boxes, lineVertices, circles } = drawBuffer

    gl.useProgram(programs.general)
    gl.disable(gl.DEPTH_TEST)
    gl.depthMask(false)
    gl.disable(gl.CULL_FACE)

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
    const circleRadiusBuffer: WebGLBuffer = initBuffer(gl.ARRAY_BUFFER, circles.radii.getView())

    updateMatrix()
    gl.uniformMatrix3fv(locations.general.uniform.u_matrix, false, mat)

    gl.clearColor(0.5, 0.5, 0.5, 0.9)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    if (growableQuadIndexArray.length > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
      gl.vertexAttribPointer(locations.general.attrib.a_position, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(locations.general.attrib.a_position)
      gl.drawElements(gl.TRIANGLES, growableQuadIndexArray.length * growableQuadIndexArray.elemSize, gl.UNSIGNED_SHORT, 0)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)
    }

    if (lineVertices.length > 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer)
      gl.vertexAttribPointer(locations.general.attrib.a_position, 2, gl.FLOAT, false, 0, 0)
      gl.enableVertexAttribArray(locations.general.attrib.a_position)
      gl.drawArrays(gl.LINES, 0, lineVertices.length)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
    }

    if (circles.centres.length > 0) {
      switch (effect) {
        case Effect.TemporalBlend:
          temporalBlendEffect(
            circleBuffer,
            circleRadiusBuffer,
            circles.centres.length
          )
          break
        case Effect.Refraction:
          normalsRefractEffect(
            totalMs,
            circleBuffer,
            circleRadiusBuffer,
            circles.centres.length
          )
          break
        case Effect.None:
          noEffect(circles, circleBuffer)
          break
        default:
          throw new Error(`Unsupported Effect '${effect as string}'.`)
      }
    }

    flushDrawBuffer()
    growableQuadIndexArray.length = 0
  }
  return draw
}