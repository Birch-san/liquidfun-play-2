varying vec2 v_position;
attribute vec2 a_position;
varying mat3 v_matrix;
uniform mat3 u_matrix;
uniform float u_radius;
void main(void) {
  gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0.0, 1.0);
  // v_position = a_position.xy;
  v_position = gl_Position.xy;
  v_matrix = u_matrix;
  gl_PointSize = u_radius;
}