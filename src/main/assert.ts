export function assert (cond: unknown): asserts cond {
  if (!(cond as boolean)) {
    throw new Error('Assertion failure')
  }
}