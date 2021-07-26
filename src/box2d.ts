// this redundant triple-slash directive seems to be the only way for the types to survive into the emitted /dist/common/*.d.ts
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="box2d-wasm" />
import Box2DFactory from 'box2d-wasm'

export const box2D: typeof Box2D & EmscriptenModule = await Box2DFactory({
  /**
   * By default, this would request /_snowpack/pkg/Box2D.wasm
   * @example (url, scriptDirectory) => `${scriptDirectory}${url}`
   * But we want to request /box2d-wasm/Box2D.wasm
   * so we climb out of /dist/ and into its sibling, /box2d-wasm/
   */
  locateFile: (url: string): string =>
    `${new URL('../box2d-wasm', import.meta.url).toString()}/${url}`
})

/**
 * destroy() is necessary on any instance created via `new`.
 * destroy() = "invoke __destroy__ (free emscripten heap)" + "free reference from JS cache"
 * but there's another way to create instances: wrapPointer().
 * wrapPointer() creates (or retrieves from cache) instances _without_ malloc()ing
 * memory on Emscripten's heap.
 * we need to cleanup after wrapPointer(). destroy() is not necessary, but we do need
 * to free up the JS cache.
 * wrapPointer() may be called by us, or under-the-hood
 * (i.e. by any method which returns an instance).
 * iterate through all classes which we believe have had instances
 * created via an explicit or under-the-hood wrapPointer().
 * free those instances from their cache.
 */
export class LeakMitigator {
  private readonly instances = new Map<typeof Box2D.WrapperObject, Set<Box2D.WrapperObject>>()

  /**
   * wrap this around any Emscripten method which returns an object.
   * records the instance, so that we can free it from cache later
   */
  recordLeak = <Instance extends Box2D.WrapperObject>(
    instance: Instance,
    b2Class: typeof Box2D.WrapperObject = box2D.getClass(instance)
  ): Instance => {
    const instances = this.instances.get(b2Class) ?? new Set()
    instances.add(instance)
    this.instances.set(b2Class, instances)
    return instance
  }

  /**
   * prefer this over {@link Box2D.wrapPointer}.
   * records the instance that's created, so that we can free it from cache later
   */
  safeWrapPointer = <
  TargetClass extends typeof Box2D.WrapperObject & (
    new (...args: any[]) => InstanceType<TargetClass>
  ) = typeof Box2D.WrapperObject>(
    pointer: number,
    targetType?: TargetClass
  ): InstanceType<TargetClass> =>
    this.recordLeak(
      box2D.wrapPointer(pointer, targetType),
      targetType
    )

  /**
   * access the cache structure of each Emscripten class for which we recorded instances,
   * then free from cache every instance that we recorded.
   */
  freeLeaked = (): void => {
    const { getCache, getPointer } = box2D
    for (const [b2Class, instances] of this.instances.entries()) {
      const cache = getCache(b2Class)
      for (const instance of instances) {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete cache[getPointer(instance)]
      }
    }
    this.instances.clear()
  }
}