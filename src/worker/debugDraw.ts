import { GrowableQuadArray, GrowableVec2Array, growableQuadArray, growableVec2Array } from './growableTypedArray'

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

const DrawSolidCircle: Box2D.JSDraw['DrawSolidCircle'] =
(center_p: number, radius: number, axis_p: number, color_p: number): void => {
  const color: Box2D.b2Color = wrapPointer(color_p, b2Color)
  const center: Box2D.b2Vec2 = wrapPointer(center_p, b2Vec2)
  const axis: Box2D.b2Vec2 = wrapPointer(axis_p, b2Vec2)
}

export interface DrawBuffer {
  boxes: GrowableQuadArray
  lineVertices: GrowableVec2Array
}
export const drawBuffer: DrawBuffer = {
  boxes: growableQuadArray,
  lineVertices: growableVec2Array
}
export const flushDrawBuffer = (): void => {
  const { boxes, lineVertices } = drawBuffer
  boxes.length = 0
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
    const transform: Box2D.b2Transform = wrapPointer(transform_p, b2Transform)
  },
  DrawParticles: (centers_p: number, radius: number, colors_p: number, count: number): void => {
    // const color: Box2D.b2Color = wrapPointer(colors_p, b2Color)
  },
  DrawPoint: (vertex_p: number, sizeMetres: number, color_p: number): void => {
    const color: Box2D.b2Color = wrapPointer(color_p, b2Color)
    const vertex: Box2D.b2Vec2 = wrapPointer(vertex_p, b2Vec2)
  }
})
debugDraw.SetFlags(e_shapeBit | e_particleBit)