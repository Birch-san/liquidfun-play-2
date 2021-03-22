interface TypedArray extends ArrayBufferView {
  length: number
}
interface ArrayBufferViewCtor<T extends TypedArray> {
  new (): T
  new (
    buffer: ArrayBufferLike,
    byteOffset?: number,
    length?: number
  ): T
  new (
    length: number
  ): T
}

class GrowableTypedArray<T extends TypedArray> {
  private buffer: T
  constructor (
    private readonly ctor: ArrayBufferViewCtor<T>
  ) {
    this.buffer = new ctor()
  }

  ensureLength (desiredLength: number): void {
    if (this.buffer.length < desiredLength) {
      this.buffer = new this.ctor(desiredLength)
    }
  }

  getSlice (desiredLength: number): T {
    return this.buffer.length === desiredLength
      ? this.buffer
      : new this.ctor(this.buffer.buffer, 0, desiredLength)
  }
}

class GrowableQuadArray extends GrowableTypedArray<Float32Array> {
  private readonly floatsPerQuad: number
  constructor () {
    super(Float32Array)
    const quadVertices = 4
    const floatsPerVec2 = 2
    this.floatsPerQuad = quadVertices * floatsPerVec2
  }

  ensureLength (quads: number): void {
    super.ensureLength(quads * this.floatsPerQuad)
  }

  getSlice (quads: number): Float32Array {
    return super.getSlice(quads * this.floatsPerQuad)
  }
}
export const growableQuadArray = new GrowableQuadArray()

class GrowableQuadIndexArray extends GrowableTypedArray<Uint16Array> {
  private readonly shortsPerQuad = 6
  constructor () {
    super(Uint16Array)
  }

  ensureLength (quads: number): void {
    super.ensureLength(quads * this.shortsPerQuad)
  }

  getSlice (quads: number): Uint16Array {
    return super.getSlice(quads * this.shortsPerQuad)
  }
}
export const growableQuadIndexArray = new GrowableQuadIndexArray()

class GrowableLineArray extends GrowableTypedArray<Float32Array> {
  private readonly floatsPerLine
  constructor () {
    super(Float32Array)
    const floatsPerVec2 = 2
    const vec2sPerLine = 2
    this.floatsPerLine = floatsPerVec2 * vec2sPerLine
  }

  ensureLength (vectors: number): void {
    super.ensureLength(vectors * this.floatsPerLine)
  }

  getSlice (vectors: number): Float32Array {
    return super.getSlice(vectors * this.floatsPerLine)
  }
}
export const growableLineArray = new GrowableLineArray()