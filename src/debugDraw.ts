import type { GrowableColourArray, GrowableQuadArray, GrowableRadiusArray, GrowableRandomRadiusArray, GrowableTriangleFanArray, GrowableVec2Array } from './growableTypedArray'
import { circleCentreArray, circleTriangleFanArray, circleRadiusArray, particleCentreArray, growableColourArray, growableQuadArray, growableVec2Array, randomRadiusArray } from './growableTypedArray'

const { box2D } = await import('./box2d')
const {
  b2Color,
  b2Draw: {
    e_shapeBit,
    e_particleBit
  },
  b2Vec2,
  b2Transform,
  getPointer,
  HEAPF32,
  JSDraw,
  wrapPointer
} = box2D
const dummyAxis = new b2Vec2(0, 0)
const dummyAxis_p = getPointer(dummyAxis)
// we have Box2D structures which need to outlive those created in demos.
export const dontDestroy = new Set<Box2D.b2Vec2>([dummyAxis])

const DrawSolidCircle: Box2D.JSDraw['DrawSolidCircle'] =
(center_p: number, radius: number, axis_p: number, color_p: number): void => {
  // const color: Box2D.b2Color = wrapPointer(color_p, b2Color)
  // const center: Box2D.b2Vec2 = wrapPointer(center_p, b2Vec2)

  // intentionally not implementing rendering of axis
  // const axis: Box2D.b2Vec2 = wrapPointer(axis_p, b2Vec2)

  drawBuffer.circles.centres.emplace(
    HEAPF32[center_p >> 2],
    HEAPF32[center_p + 4 >> 2]
  )
  drawBuffer.circles.triangleFans.emplace(
    HEAPF32[center_p >> 2],
    HEAPF32[center_p + 4 >> 2],
    radius
  )
  drawBuffer.circles.radii.emplace(radius)
  // this works, but prefer to have a standard colour rather than use debug draw's colours
  // drawBuffer.circles.colours.emplace(
  //   HEAPF32[color_p >> 2],
  //   HEAPF32[color_p + 4 >> 2],
  //   HEAPF32[color_p + 8 >> 2],
  //   HEAPF32[color_p + 12 >> 2]
  // )
  // paint everything our favourite colour instead
  drawBuffer.circles.colours.push(drawBuffer.circles.colour)
}

export interface CircleBuffers {
  centres: GrowableVec2Array
  triangleFans: GrowableTriangleFanArray
  colours: GrowableColourArray
  radii: GrowableRadiusArray
  colour: Float32Array
}

export interface ParticleBuffers {
  centres: GrowableVec2Array
  radii: GrowableRandomRadiusArray
  systemRadius: number
  colour: Float32Array
}

export interface DrawBuffer {
  boxes: GrowableQuadArray
  circles: CircleBuffers
  particles: ParticleBuffers
  lineVertices: GrowableVec2Array
}
export const drawBuffer: DrawBuffer = {
  boxes: growableQuadArray,
  circles: {
    centres: circleCentreArray,
    triangleFans: circleTriangleFanArray,
    radii: circleRadiusArray,
    colours: growableColourArray,
    colour: new Float32Array([0.75, 0.75, 0.75, 1])
  },
  particles: {
    centres: particleCentreArray,
    radii: randomRadiusArray,
    systemRadius: 1,
    colour: new Float32Array([1, 1, 1, 1])
  },
  lineVertices: growableVec2Array
}
export const flushDrawBuffer = (): void => {
  const { boxes, circles, particles, lineVertices } = drawBuffer
  boxes.length = 0
  circles.centres.length = 0
  circles.triangleFans.length = 0
  circles.radii.length = 0
  circles.colours.length = 0
  particles.centres.length = 0
  lineVertices.length = 0
}

const DrawPolygon: Box2D.JSDraw['DrawPolygon'] =
(vertices_p: number, vertexCount: number, color_p: number): void => {
  // const color: Box2D.b2Color = wrapPointer(color_p, b2Color)
  // avoiding reifyArray because it does a bunch of allocations
  // const vertices: Box2D.b2Vec2[] = reifyArray(vertices_p, vertexCount, sizeOfB2Vec2, b2Vec2)
  if (vertexCount === 4) {
    // this push works, but avoiding in case the new Float32Array costs me a heap allocation
    // drawBuffer.boxes.push(new Float32Array(HEAPF32.buffer, vertices_p, vertexCount * floatsPerVec2))
    drawBuffer.boxes.emplace(
      HEAPF32[vertices_p >> 2],
      HEAPF32[vertices_p + 4 >> 2],
      HEAPF32[vertices_p + 8 >> 2],
      HEAPF32[vertices_p + 12 >> 2],
      HEAPF32[vertices_p + 16 >> 2],
      HEAPF32[vertices_p + 20 >> 2],
      HEAPF32[vertices_p + 24 >> 2],
      HEAPF32[vertices_p + 28 >> 2]
    )
  } else {
    // iterate through all vertices and create line segments like how DrawSegment does
  }
}

export const debugDraw = Object.assign<
Box2D.JSDraw,
Partial<Box2D.JSDraw>
>(new JSDraw(), {
  DrawSegment: (vert1_p: number, vert2_p: number, color_p: number): void => {
    // const color: Box2D.b2Color = wrapPointer(color_p, b2Color)
    // const vert1: Box2D.b2Vec2 = wrapPointer(vert1_p, b2Vec2)
    // const vert2: Box2D.b2Vec2 = wrapPointer(vert2_p, b2Vec2)

    // these pushes work, but avoiding in case the new Float32Array costs me a heap allocation
    // drawBuffer.lineVertices.push(new Float32Array(HEAPF32.buffer, vert1_p, floatsPerVec2))
    // drawBuffer.lineVertices.push(new Float32Array(HEAPF32.buffer, vert2_p, floatsPerVec2))
    drawBuffer.lineVertices.ensureFits(drawBuffer.lineVertices.length + 2)
    drawBuffer.lineVertices.emplaceWithoutRealloc(HEAPF32[vert1_p >> 2], HEAPF32[vert1_p + 4 >> 2])
    drawBuffer.lineVertices.emplaceWithoutRealloc(HEAPF32[vert2_p >> 2], HEAPF32[vert2_p + 4 >> 2])
  },
  DrawPolygon,
  DrawSolidPolygon: DrawPolygon,
  DrawCircle: (center_p: number, radius: number, color_p: number): void =>
    DrawSolidCircle(center_p, radius, dummyAxis_p, color_p),
  DrawSolidCircle,
  DrawTransform: (transform_p: number): void => {
    // const transform: Box2D.b2Transform = wrapPointer(transform_p, b2Transform)
  },
  DrawParticles: (centers_p: number, radius: number, colors_p: number, count: number): void => {
    // const color: Box2D.b2Color = wrapPointer(colors_p, b2Color)
    drawBuffer.particles.centres.ensureFits(count)
    drawBuffer.particles.radii.ensureFits(count)
    // does the creation of this ArrayBuffer view result in garbage?
    drawBuffer.particles.centres.set(new Float32Array(HEAPF32.buffer, centers_p, count * drawBuffer.particles.centres.elemSize))
    drawBuffer.particles.centres.length = count
    drawBuffer.particles.radii.length = count
    drawBuffer.particles.systemRadius = radius
    // drawBuffer.circles.radii.fill(radius)
    // the colour's just black, so this wasn't very impressive
    // drawBuffer.circles.color[0] = HEAPF32[colors_p >> 2]
    // drawBuffer.circles.color[1] = HEAPF32[colors_p + 4 >> 2]
    // drawBuffer.circles.color[2] = HEAPF32[colors_p + 8 >> 2]
  },
  DrawPoint: (vertex_p: number, sizeMetres: number, color_p: number): void => {
    // const color: Box2D.b2Color = wrapPointer(color_p, b2Color)
    // const vertex: Box2D.b2Vec2 = wrapPointer(vertex_p, b2Vec2)
  }
})
debugDraw.SetFlags(e_shapeBit | e_particleBit)