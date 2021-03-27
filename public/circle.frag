precision mediump float;
varying vec2 v_position;
uniform float radius;

void main(void) {
  if (distance(gl_FragCoord.xy, v_position) > radius) {
    discard;
  }
  gl_FragColor = vec4(0.0, 0.0, 0.0, 0.1);
}