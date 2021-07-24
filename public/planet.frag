precision mediump float;
varying float v_diameter;
varying vec4 v_colour;
uniform vec4 u_edge_colour;
uniform float u_edge_size;

void main(void) {
  float distance = length(2.0 * gl_PointCoord - 1.0);
  if (distance > 1.0) {
    discard;
  }

  float sEdge = smoothstep(
      v_diameter - u_edge_size - 2.0,
      v_diameter - u_edge_size,
      distance * (v_diameter + u_edge_size)
  );
  gl_FragColor = (
    u_edge_colour * sEdge
  ) +
    (
      (1.0 - sEdge) * v_colour
    );
  // gl_FragColor.a = gl_FragColor.a * (1.0 - smoothstep(
  //   diameter - 2.0,
  //   diameter,
  //   distance * diameter
  // ));
}