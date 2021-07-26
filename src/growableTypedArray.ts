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

export class GrowableTypedArray<T extends TypedArray> {
  protected static readonly incrementSize = 2 ** 10
  protected buffer: T
  public length = 0
  constructor (
    protected readonly ctor: ArrayBufferViewCtor<T>,
    public readonly elemSize: number
  ) {
    this.buffer = new ctor(GrowableTypedArray.incrementSize)
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
      const newLength = Math.ceil(desiredLength / GrowableTypedArray.incrementSize) * GrowableTypedArray.incrementSize
      const newBuffer = new this.ctor(newLength)
      newBuffer.set(this.buffer)
      this.buffer = newBuffer
    }
  }

  getView (): T {
    return new this.ctor(this.buffer.buffer, 0, this.length * this.elemSize)
  }

  set (array: ArrayLike<number>): void {
    this.buffer.set(array)
  }
}

export class GrowableQuadArray extends GrowableTypedArray<Float32Array> {
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
    const desiredElems = this.length + 1
    this.ensureFits(desiredElems)
    this.buffer[this.length * this.elemSize] = x0
    this.buffer[this.length * this.elemSize + 1] = y0
    this.buffer[this.length * this.elemSize + 2] = x1
    this.buffer[this.length * this.elemSize + 3] = y1
    this.buffer[this.length * this.elemSize + 4] = x2
    this.buffer[this.length * this.elemSize + 5] = y2
    this.buffer[this.length * this.elemSize + 6] = x3
    this.buffer[this.length * this.elemSize + 7] = y3
    this.length++
  }
}
export const growableQuadArray = new GrowableQuadArray()

class GrowableQuadIndexArray extends GrowableTypedArray<Uint16Array> {
  constructor () {
    const shortsPerQuad = 6
    super(Uint16Array, shortsPerQuad)
  }

  emplaceWithoutRealloc (
    ix0: number,
    ix1: number,
    ix2: number,
    ix3: number,
    ix4: number,
    ix5: number
  ): void {
    this.buffer[this.length * this.elemSize] = ix0
    this.buffer[this.length * this.elemSize + 1] = ix1
    this.buffer[this.length * this.elemSize + 2] = ix2
    this.buffer[this.length * this.elemSize + 3] = ix3
    this.buffer[this.length * this.elemSize + 4] = ix4
    this.buffer[this.length * this.elemSize + 5] = ix5
    this.length++
  }
}
export const growableQuadIndexArray = new GrowableQuadIndexArray()

export class GrowableColourArray extends GrowableTypedArray<Float32Array> {
  constructor () {
    const floatsPerColour = 4
    super(Float32Array, floatsPerColour)
  }

  emplaceWithoutRealloc (
    r: number,
    g: number,
    b: number,
    a: number
  ): void {
    this.buffer[this.length * this.elemSize] = r
    this.buffer[this.length * this.elemSize + 1] = g
    this.buffer[this.length * this.elemSize + 2] = b
    this.buffer[this.length * this.elemSize + 3] = a
    this.length++
  }

  emplace (
    r: number,
    g: number,
    b: number,
    a: number
  ): void {
    this.ensureFits(this.length + 1)
    this.emplaceWithoutRealloc(r, g, b, a)
  }

  push ([r, g, b, a]: Iterable<number>): void {
    this.emplace(r, g, b, a)
  }

  getBuffer (): Float32List {
    return this.buffer
  }
}
export const growableColourArray = new GrowableColourArray()

export class GrowableVec2Array extends GrowableTypedArray<Float32Array> {
  constructor () {
    const floatsPerVec2 = 2
    super(Float32Array, floatsPerVec2)
  }

  emplaceWithoutRealloc (x: number, y: number): void {
    this.buffer[this.length * this.elemSize] = x
    this.buffer[this.length * this.elemSize + 1] = y
    this.length++
  }

  emplace (x: number, y: number): void {
    this.ensureFits(this.length + 1)
    this.emplaceWithoutRealloc(x, y)
  }

  getBuffer (): Float32List {
    return this.buffer
  }
}

export class GrowableRadiusArray extends GrowableTypedArray<Float32Array> {
  constructor () {
    super(Float32Array, 1)
  }

  emplace (radius: number): void {
    const newLength = this.length + 1
    this.ensureFits(newLength)
    this.buffer[this.length * this.elemSize] = radius
    this.length = newLength
  }

  get (ix: number): number {
    return this.buffer[ix]
  }
}

export class GrowableRandomRadiusArray extends GrowableTypedArray<Float32Array> {
  constructor () {
    super(Float32Array, 1)
    this.buffer.forEach((_, ix: number, arr: Float32Array): void => {
      arr[ix] = this.element()
    })
  }

  private element (): number {
    return Math.random() * 0.8 + 1.5
  }

  ensureFits (desiredElems: number): void {
    const oldLength = this.buffer.length
    super.ensureFits(desiredElems)
    const desiredLength = desiredElems * this.elemSize
    if (oldLength <= desiredLength) {
      this.buffer.subarray(oldLength).forEach((_, ix: number, arr: Float32Array): void => {
        arr[ix] = this.element()
      })
    }
  }

  get (ix: number): number {
    return this.buffer[ix]
  }
}

export class GrowableTriangleFanArray extends GrowableTypedArray<Float32Array> {
  constructor (public readonly vertices: number) {
    // add one because we have to repeat the first vertex twice (used as a start and end)
    // add another because we have to include the centre
    super(Float32Array, 2 * (2 + vertices))
  }

  emplace (x: number, y: number, radius: number): void {
    const newLength = this.length + 1
    this.ensureFits(newLength)
    this.buffer[this.length * this.elemSize] = x
    this.buffer[this.length * this.elemSize + 1] = y
    const angleDelta = 2 * Math.PI / this.vertices
    for (let i = 0; i < this.vertices; i++) {
      const angle = angleDelta * i
      this.buffer[this.length * this.elemSize + 2 + 2 * i] = x + Math.cos(angle) * radius
      this.buffer[this.length * this.elemSize + 2 + 2 * i + 1] = y + Math.sin(angle) * radius
    }
    this.buffer[this.length * this.elemSize + 2 + 2 * this.vertices] = this.buffer[this.length * this.elemSize + 2]
    this.buffer[this.length * this.elemSize + 2 + 2 * this.vertices + 1] = this.buffer[this.length * this.elemSize + 3]
    this.length = newLength
  }
}

export const growableVec2Array = new GrowableVec2Array()
export const circleCentreArray = new GrowableVec2Array()
export const circleTriangleFanArray = new GrowableTriangleFanArray(20)
export const circleRadiusArray = new GrowableRadiusArray()
export const particleCentreArray = new GrowableVec2Array()
export const randomRadiusArray = new GrowableRandomRadiusArray()