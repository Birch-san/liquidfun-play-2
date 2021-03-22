const quads: Float32Array[] = []
let freeQuadIx = 0

const quadVertices = 4
const floatsPerVec2 = 2
const floatsPerQuad = quadVertices * floatsPerVec2

export const allocQuads = (n: number): void => {
  const storage = new Float32Array(floatsPerQuad * n)
  for (let i = 0; i < n; i++) {
    const view = new Float32Array(
      storage.buffer,
      floatsPerQuad * i * Float32Array.BYTES_PER_ELEMENT,
      floatsPerQuad
    )
    quads.push(view)
  }
}

export const allocQuad = (): Float32Array => {
  const newQuad = new Float32Array(floatsPerQuad)
  quads.push(newQuad)
  return newQuad
}

export const getQuad = (): Float32Array => {
  const quad: Float32Array = freeQuadIx === quads.length
    ? allocQuad()
    : quads[freeQuadIx]
  freeQuadIx++
  return quad
}

export const releaseQuads = (): void => {
  freeQuadIx = 0
}