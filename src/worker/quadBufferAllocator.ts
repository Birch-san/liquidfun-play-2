export let quadBuffer = new Float32Array()

const quadVertices = 4
const floatsPerVec2 = 2
const floatsPerQuad = quadVertices * floatsPerVec2

export const ensureQuadBufferFits = (quads: number): void => {
  const desiredLength = quads * floatsPerQuad
  if (quadBuffer.length < desiredLength) {
    quadBuffer = new Float32Array(quads * floatsPerQuad)
  }
}

export const getQuadBufferSlice = (quads: number): Float32Array => {
  const desiredLength = quads * floatsPerQuad
  return quadBuffer.length === desiredLength
    ? quadBuffer
    : new Float32Array(quadBuffer.buffer, 0, desiredLength)
}