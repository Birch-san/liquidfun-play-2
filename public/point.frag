/*
 * https://github.com/google/liquidfun/blob/master/liquidfun/Box2D/EyeCandy/assets/point.glslf
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

// This shader simply outputs the pre-computed parameters from the texture
// created in PrecomputeBlobTexture() for each pixel of the point sprite.
// They are then additively blended into the FBO, and used in fullscreen.glslf

precision mediump float;

uniform sampler2D tex0; // the precomputed parameter texture

void main() {
  gl_FragColor = texture2D(tex0, gl_PointCoord);
}
