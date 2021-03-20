// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference types="@types/snowpack-env" />
declare module '*.module.css' {
  const classes: {[key: string]: string}
  export default classes
}
// declare module '*.worker' {
//   const WorkerFactory: new () => Worker
//   export default WorkerFactory
// }