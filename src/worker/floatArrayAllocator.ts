export class FloatArrayAllocator {
  private freeElemIx = 0
  private readonly elems: Float32Array[] = []
  constructor (
    private readonly floatsPerElement: number
  ) {
  }

  growN (n: number): void {
    const storage = new Float32Array(this.floatsPerElement * n)
    for (let i = 0; i < n; i++) {
      const view = new Float32Array(
        storage.buffer,
        this.floatsPerElement * i * Float32Array.BYTES_PER_ELEMENT,
        this.floatsPerElement
      )
      this.elems.push(view)
    }
  }

  grow (): Float32Array {
    const newElem = new Float32Array(this.floatsPerElement)
    this.elems.push(newElem)
    return newElem
  }

  acquire (): Float32Array {
    const elem: Float32Array = this.freeElemIx === this.elems.length
      ? this.grow()
      : this.elems[this.freeElemIx]
    this.freeElemIx++
    return elem
  }

  release (): void {
    this.freeElemIx = 0
  }
}

const floatsPerVec2 = 2
const vec2PerLine = 2
const floatsPerLine = floatsPerVec2 * vec2PerLine
export const lineAllocator = new FloatArrayAllocator(floatsPerLine)

const quadVertices = 4
const floatsPerQuad = quadVertices * floatsPerVec2
export const quadAllocator = new FloatArrayAllocator(floatsPerQuad)
