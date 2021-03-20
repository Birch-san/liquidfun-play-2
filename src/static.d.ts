/// <reference types="@types/snowpack-env" />
declare module '*.module.css' {
  const classes: {[key: string]: string};
  export default classes;
}