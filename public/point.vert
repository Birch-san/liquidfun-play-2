/*
 * Original from:
 * https://github.com/google/liquidfun/blob/master/liquidfun/Box2D/EyeCandy/assets/point.glslv
 *
 * With modifications by Alex Birch:
 * - transform coordinates via matrix, to (for example) translate the camera
 * - use the scaling convention in this repository which derives scale factor from that same matrix
 * - add extra pixels to the point size for better tesselation
 * - make explicit that radius to diameter conversion is not the job of the scale uniform
 * - set floating-point precision to medium
 * - make position attribute a vec2
 * - parameterise particle system radius (i.e. make it separate to per-particle random variance in radius)
 *
 * Copyright notice applicable to the original code is as follows:
 *
 * Copyright (c) 2013 Google, Inc.
 *
 * This software is provided 'as-is', without any express or implied
 * warranty.  In no event will the authors be held liable for any damages
 * arising from the use of this software.
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 * 1. The origin of this software must not be misrepresented; you must not
 * claim that you wrote the original software. If you use this software
 * in a product, an acknowledgment in the product documentation would be
 * appreciated but is not required.
 * 2. Altered source versions must be plainly marked as such, and must not be
 * misrepresented as being the original software.
 * 3. This notice may not be removed or altered from any source distribution.
 */

precision mediump float;
// Scales the particle to the correct size. All the fun happens in point.ps

attribute vec2 a_position;     // in 2d worldspace
attribute float a_radius;      // particle radius in metres

uniform mat3 u_matrix;         // worldspace to clip space transformation
uniform float u_scale;         // pixels in a metre
uniform float u_radius;        // particle system radius in metres

void main(void) {
  gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0.0, 1.0);
  gl_PointSize = 2.0 * a_radius * u_radius * u_scale + 7.0;
}
