precision mediump float;
uniform float u_radius_px;
uniform float u_bleed_size_px;
uniform float u_edge_size_px;
uniform vec2 u_centre;
uniform mat3 u_matrix_metres_to_canvas;
uniform vec4 u_colour;
uniform vec4 u_edge_colour;
uniform vec4 u_highlight_colour;

void main(void) {
  vec2 centre = (u_matrix_metres_to_canvas * vec3(u_centre, 1)).xy;
  float distance_px = length(gl_FragCoord.xy - centre);
  if (distance_px > u_radius_px - u_bleed_size_px) {
    discard;
  }
  float distance = distance_px / u_radius_px;

  if (distance_px > u_radius_px - u_edge_size_px) {
    float sEdge = smoothstep(
        u_radius_px - u_edge_size_px,
        u_radius_px,
        distance * u_radius_px
    );
    gl_FragColor = (
      u_edge_colour * sEdge
    ) +
      (
        (1.0 - sEdge) * u_colour
      );
  } else {
    float sEdge = smoothstep(
        u_radius_px - u_edge_size_px,
        0.0,
        distance * (u_radius_px - u_edge_size_px)
    );
    gl_FragColor = (
      u_highlight_colour * sEdge
    ) +
      (
        (1.0 - sEdge) * u_colour
      );
  }
  // gl_FragColor.a = gl_FragColor.a * (1.0 - smoothstep(
  //   u_radius_px - u_edge_size_px,
  //   u_radius_px,
  //   distance * u_radius_px
  // ));
}