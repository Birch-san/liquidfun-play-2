precision mediump float;
attribute vec2 a_position;
attribute float a_radius;
attribute vec4 a_colour;
uniform mat3 u_matrix;
uniform float u_pixels_per_metre;
uniform float u_edge_size;
varying float v_diameter;
varying vec4 v_colour;

void main(void) {
  float diameter = 2.0 * a_radius * u_pixels_per_metre;
  gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0.0, 1.0);
  gl_PointSize = diameter + u_edge_size + 1.0;
  v_colour = a_colour;
  v_diameter = diameter;
}