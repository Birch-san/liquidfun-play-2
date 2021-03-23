import { GrowableQuadArray2, GrowableVec2Array2, growableQuadArray2, growableVec2Array2 } from './growableTypedArray2'

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
  boxes: GrowableQuadArray2
  lineVertices: GrowableVec2Array2
}
export const drawBuffer: DrawBuffer = {
  boxes: growableQuadArray2,
  lineVertices: growableVec2Array2
}
export const flushDrawBuffer = (): void => {
  const { boxes, lineVertices } = drawBuffer
  boxes.length = 0
  lineVertices.length = 0
}

const floatsPerVec2 = 2

const DrawPolygon: Box2D.JSDraw['DrawPolygon'] =
(vertices_p: number, vertexCount: number, color_p: number): void => {
  // const color: Box2D.b2Color = wrapPointer(color_p, b2Color)
  // TODO: reifyArray does a bunch of allocations, may not be suited for perf-sensitive tasks
  // const vertices: Box2D.b2Vec2[] = reifyArray(vertices_p, vertexCount, sizeOfB2Vec, b2Vec2)
  // console.log(vertices.map(({ x, y }: Box2D.b2Vec2) => `[${x}, ${y}]`).join(', '))
  // [-0.5, 169.5], [0.5, 169.5], [0.5, 170.5], [-0.5, 170.5]
  // debugDrawBuffer.boxes.push(new Float32Array())
  // console.log(
  //   HEAPF32[vertices_p >> 2],
  //   HEAPF32[vertices_p + 4 >> 2],
  //   HEAPF32[vertices_p + 8 >> 2],
  //   HEAPF32[vertices_p + 12 >> 2],
  //   HEAPF32[vertices_p + 16 >> 2],
  //   HEAPF32[vertices_p + 20 >> 2],
  //   HEAPF32[vertices_p + 24 >> 2],
  //   HEAPF32[vertices_p + 28 >> 2]
  // )
  if (vertexCount === 4) {
    drawBuffer.boxes.push(new Float32Array(HEAPF32.buffer, vertices_p, vertexCount * floatsPerVec2))
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
    drawBuffer.lineVertices.push(new Float32Array(HEAPF32.buffer, vert1_p, floatsPerVec2))
    drawBuffer.lineVertices.push(new Float32Array(HEAPF32.buffer, vert2_p, floatsPerVec2))
  },
  DrawPolygon,
  DrawSolidPolygon: DrawPolygon,
  DrawCircle: (center_p: number, radius: number, color_p: number): void =>
    DrawSolidCircle(center_p, radius, dummyAxis_p, color_p),
  DrawSolidCircle,
  DrawTransform: (transform_p: number): void => {
    const transform: Box2D.b2Transform = wrapPointer(transform_p, b2Transform);
  },
  DrawPoint: (vertex_p: number, sizeMetres: number, color_p: number): void => {
    const color: Box2D.b2Color = wrapPointer(color_p, b2Color)
    const vertex: Box2D.b2Vec2 = wrapPointer(vertex_p, b2Vec2)
  }
})
debugDraw.SetFlags(e_shapeBit | e_particleBit)