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
    private readonly ctor: ArrayBufferViewCtor<T>,
    public readonly elemSize: number
  ) {
    this.buffer = new ctor()
  }

  ensureLength (desiredElems: number): void {
    const desiredLength = desiredElems * this.elemSize
    if (this.buffer.length < desiredLength) {
      this.buffer = new this.ctor(desiredLength)
    }
  }

  getSlice (desiredElems: number): T {
    const desiredLength = desiredElems * this.elemSize
    return this.buffer.length === desiredLength
      ? this.buffer
      : new this.ctor(this.buffer.buffer, 0, desiredLength)
  }
}

class GrowableQuadIndexArray extends GrowableTypedArray<Uint16Array> {
  constructor () {
    const shortsPerQuad = 6
    super(Uint16Array, shortsPerQuad)
  }
}
export const growableQuadIndexArray = new GrowableQuadIndexArray()