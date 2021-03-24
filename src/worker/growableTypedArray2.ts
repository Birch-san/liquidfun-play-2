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
  protected buffer: T
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

export class GrowableQuadArray extends GrowableTypedArray2<Float32Array> {
  constructor () {
    const quadVertices = 4
    const floatsPerVec2 = 2
    const floatsPerQuad = quadVertices * floatsPerVec2
    super(Float32Array, floatsPerQuad)
  }

  emplace (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
  ): void {
    const desiredElems = this.length + 4
    this.ensureFits(desiredElems)
    this.buffer[this.length * this.elemSize] = x0
    this.buffer[this.length * this.elemSize + 1] = y0
    this.buffer[this.length * this.elemSize + 2] = x1
    this.buffer[this.length * this.elemSize + 3] = y1
    this.buffer[this.length * this.elemSize + 4] = x2
    this.buffer[this.length * this.elemSize + 5] = y2
    this.buffer[this.length * this.elemSize + 6] = x3
    this.buffer[this.length * this.elemSize + 7] = y3
    this.length += 4
  }
}
export const growableQuadArray = new GrowableQuadArray()

export class GrowableVec2Array extends GrowableTypedArray2<Float32Array> {
  constructor () {
    const floatsPerVec2 = 2
    super(Float32Array, floatsPerVec2)
  }

  emplace (x: number, y: number): void {
    const desiredElems = this.length + 1
    this.ensureFits(desiredElems)
    this.buffer[this.length * this.elemSize] = x
    this.buffer[this.length * this.elemSize + 1] = y
    this.length++
  }
}
export const growableVec2Array = new GrowableVec2Array()