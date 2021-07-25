precision mediump float;
varying float v_diameter;
varying vec4 v_colour;
uniform vec4 u_edge_colour;
uniform vec4 u_highlight_colour;
uniform float u_edge_size_px;

void main(void) {
  float distance = length(2.0 * gl_PointCoord - 1.0);
  if (distance > 1.0) {
    discard;
  }

  // gl_FragColor = u_edge_colour * distance;
  if (distance > 0.95) {
    float sEdge = smoothstep(
        v_diameter - u_edge_size_px - 2.0,
        v_diameter - u_edge_size_px,
        distance * (v_diameter + u_edge_size_px)
    );
    gl_FragColor = (
      u_edge_colour * sEdge
    ) +
      (
        (1.0 - sEdge) * v_colour
      );
  } else {
    float sEdge = smoothstep(
        v_diameter - u_edge_size_px,
        0.0,
        distance * (v_diameter - u_edge_size_px)
    );
    gl_FragColor = (
      u_highlight_colour * sEdge
    ) +
      (
        (1.0 - sEdge) * v_colour
      );
  }
  // gl_FragColor.a = gl_FragColor.a * (1.0 - smoothstep(
  //   v_diameter - 2.0,
  //   v_diameter,
  //   distance * v_diameter
  // ));
}