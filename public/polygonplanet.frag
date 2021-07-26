precision mediump float;
uniform float u_diameter_px;
uniform float u_edge_size_px;
uniform vec2 u_centre;
uniform mat3 u_matrix_metres_to_canvas;
// uniform mat3 u_matrix;
uniform vec4 u_colour;
uniform vec4 u_edge_colour;
uniform vec4 u_highlight_colour;

void main(void) {
  // maybe compare gl_FragCoord to u_matrix * u_centre?
  // https://www.khronos.org/registry/OpenGL-Refpages/gl4/html/gl_FragCoord.xhtml
  // float distance = length(2.0 * gl_PointCoord - 1.0);
  vec2 centre = (u_matrix_metres_to_canvas * vec3(u_centre, 1)).xy;
  float distance_px = length(gl_FragCoord.xy - centre);
  float distance = distance_px / (u_diameter_px / 2.0 * 160.0 + u_edge_size_px);
  // vec2 centre = (u_matrix_metres_to_canvas * vec3(u_centre, 1)).xy;
  // float distance = length(2.0 * centre - 1.0);
  // if (distance > 1.0) {
  //   discard;
  // }

  // gl_FragColor = u_edge_colour * distance;
  if (distance > 0.95) {
    float sEdge = smoothstep(
        u_diameter_px - u_edge_size_px - 2.0,
        u_diameter_px - u_edge_size_px,
        distance * (u_diameter_px + u_edge_size_px)
    );
    gl_FragColor = (
      u_edge_colour * sEdge
    ) +
      (
        (1.0 - sEdge) * u_colour
      );
  } else {
    float sEdge = smoothstep(
        u_diameter_px - u_edge_size_px,
        0.0,
        distance * (u_diameter_px - u_edge_size_px)
    );
    gl_FragColor = (
      u_highlight_colour * sEdge
    ) +
      (
        (1.0 - sEdge) * u_colour
      );
  }
  // gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  // // gl_FragColor.a = gl_FragColor.a * (1.0 - smoothstep(
  // //   u_diameter_px - 2.0,
  // //   u_diameter_px,
  // //   distance * u_diameter_px
  // // ));
}