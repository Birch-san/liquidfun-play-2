interface TypedArray extends ArrayBufferView, ArrayLike<number> {
  set: (array: ArrayLike<number>, offset?: number) => void
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

export class GrowableTypedArray2<T extends TypedArray> {
  private buffer: T
  public length = 0
  constructor (
    private readonly ctor: ArrayBufferViewCtor<T>,
    public readonly elemSize: number
  ) {
    this.buffer = new ctor()
  }

  push (elem: T): void {
    const desiredElems = this.length + 1
    this.ensureFits(desiredElems)
    this.buffer.set(elem, this.length * this.elemSize)
    this.length++
  }

  ensureFits (desiredElems: number): void {
    const desiredLength = desiredElems * this.elemSize
    if (this.buffer.length <= desiredLength) {
      const incrementSize = 2 ** 6
      const newLength = Math.ceil(desiredLength / incrementSize) * incrementSize
      const newBuffer = new this.ctor(newLength)
      newBuffer.set(this.buffer)
      this.buffer = newBuffer
    }
  }

  getView (): T {
    return new this.ctor(this.buffer.buffer, 0, this.length * this.elemSize)
  }
}

export class GrowableQuadArray2 extends GrowableTypedArray2<Float32Array> {
  constructor () {
    const quadVertices = 4
    const floatsPerVec2 = 2
    const floatsPerQuad = quadVertices * floatsPerVec2
    super(Float32Array, floatsPerQuad)
  }
}
export const growableQuadArray2 = new GrowableQuadArray2()

export class GrowableVec2Array2 extends GrowableTypedArray2<Float32Array> {
  constructor () {
    const floatsPerVec2 = 2
    super(Float32Array, floatsPerVec2)
  }
}
export const growableVec2Array2 = new GrowableVec2Array2()