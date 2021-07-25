precision mediump float;
uniform vec4 u_color;
uniform vec4 u_edge_color;
uniform float u_diameter;
uniform float u_edge_size_px;

void main(void) {
  float distance = length(2.0 * gl_PointCoord - 1.0);
  if (distance > 1.0) {
    discard;
  }

  float sEdge = smoothstep(
      u_diameter - u_edge_size_px - 2.0,
      u_diameter - u_edge_size_px,
      distance * (u_diameter + u_edge_size_px)
  );
  gl_FragColor = (
    u_edge_color * sEdge
  ) +
    (
      (1.0 - sEdge) * u_color
    );
  // gl_FragColor.a = gl_FragColor.a * (1.0 - smoothstep(
  //   u_diameter - 2.0,
  //   u_diameter,
  //   distance * u_diameter
  // ));
}