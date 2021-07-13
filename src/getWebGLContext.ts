interface GetContext {
  (contextId: 'webgl', options?: WebGLContextAttributes): WebGLRenderingContext | null
  (contextId: 'webgl2', options?: WebGLContextAttributes): WebGL2RenderingContext | null
}
interface HasGetContext {
  getContext: GetContext
}
export const getWebGLContext = (
  canvas: HasGetContext
): WebGL2RenderingContext | WebGLRenderingContext => {
  let gl: WebGL2RenderingContext | WebGLRenderingContext | null = canvas.getContext('webgl2')
  if (gl === null) {
    console.warn('Failed to create WebGL2 rendering context; falling back to WebGL')
    gl = canvas.getContext('webgl')
  }
  if (gl === null) {
    throw new Error('Failed to create WebGL rendering context')
  }
  return gl
}