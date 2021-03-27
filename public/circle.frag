precision mediump float;
varying vec2 v_position;
// uniform float radius;
// uniform mat3 u_matrix;
// varying mat3 v_matrix;
// uniform float u_alpha;

uniform vec4 uEdgeColor;
uniform float uEdgeSize;

void main(void) {
  // float center_dist = length(gl_PointCoord - 16.0);
  // float radius = 16.0;
  // if (distance((u_matrix * vec3(gl_FragCoord.xy, 1)).xy, (u_matrix * vec3(v_position, 1)).xy) > 200.0) {
  // if (distance((v_matrix * vec3(gl_FragCoord.xy, 1)).xy, (v_matrix * vec3(v_position, 1)).xy) > 200.0) {
  // if (distance((v_matrix * vec3(gl_FragCoord.xy, 1)).xy, v_position) > 200.0) {
  //   discard;
  // }
  float distance = length(2.0 * gl_PointCoord - 1.0);
  if (distance > 1.0) {
    discard;
  }
  float vSize = 4.5;

  float sEdge = smoothstep(
      vSize - uEdgeSize - 2.0,
      vSize - uEdgeSize,
      distance * (vSize + uEdgeSize)
  );
  // gl_FragColor = (uEdgeColor * sEdge) + ((1.0 - sEdge) * gl_FragColor);
  gl_FragColor = (
    vec4(0.0, 0.0, 0.0, 0.5) * sEdge
  ) +
    (
      (1.0 - sEdge) * vec4(0.0, 0.0, 0.0, 0.1)
    );
  // gl_FragColor.a = gl_FragColor.a * (1.0 - smoothstep(
  //   vSize - 2.0,
  //   vSize,
  //   distance * vSize
  // ));


  // gl_FragColor = vec4(0.0, 0.0, 0.0, 0.1);
  // gl_FragColor = vec4(0.0, u_alpha * step(center_dist, radius), 0.0, 0.1);
}