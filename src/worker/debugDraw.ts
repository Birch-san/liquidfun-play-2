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
  JSDraw,
  reifyArray,
  wrapPointer
} = box2D
const sizeOfB2Vec: number = Float32Array.BYTES_PER_ELEMENT * 2
const dummyAxis = new b2Vec2(0, 0)
const dummyAxis_p = getPointer(dummyAxis)

const DrawSolidCircle: Box2D.JSDraw['DrawSolidCircle'] =
(center_p: number, radius: number, axis_p: number, color_p: number): void => {
  const color: Box2D.b2Color = wrapPointer(color_p, b2Color)
  const center: Box2D.b2Vec2 = wrapPointer(center_p, b2Vec2)
  const axis: Box2D.b2Vec2 = wrapPointer(axis_p, b2Vec2)
}

const DrawPolygon: Box2D.JSDraw['DrawPolygon'] =
(vertices_p: number, vertexCount: number, color_p: number): void => {
  const color: Box2D.b2Color = wrapPointer(color_p, b2Color)
  // TODO: reifyArray does a bunch of allocations, may not be suited for perf-sensitive tasks
  const vertices: Box2D.b2Vec2[] = reifyArray(vertices_p, vertexCount, sizeOfB2Vec, b2Vec2)
}

export const debugDraw = Object.assign<
Box2D.JSDraw,
Partial<Box2D.JSDraw>
>(new JSDraw(), {
  DrawSegment: (vert1_p: number, vert2_p: number, color_p: number): void => {
    const color: Box2D.b2Color = wrapPointer(color_p, b2Color)
    const vert1: Box2D.b2Vec2 = wrapPointer(vert1_p, b2Vec2)
    const vert2: Box2D.b2Vec2 = wrapPointer(vert2_p, b2Vec2)
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