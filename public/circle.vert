precision mediump float;
attribute vec2 a_position;
uniform mat3 u_matrix;
uniform float u_diameter;
uniform float u_edge_size;
void main(void) {
  gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0.0, 1.0);
  gl_PointSize = u_diameter + u_edge_size + 1.0;
}