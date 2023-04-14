varying float vVertexIdx;
varying vec2 vPtPos;
varying float vShouldDiscard;

uniform float opacity;
uniform ivec2 texSize;
uniform sampler2D texImg;

void main() {
  vec2 frameSizeF = vec2(texSize.x / 2, texSize.y);
  ivec2 frameSize = ivec2(frameSizeF);

  int vertIdx = int(vVertexIdx);
  int actualNumPts = frameSize.x * frameSize.y;

  if(vShouldDiscard != 0.0 || vertIdx >= actualNumPts) {
    discard;
  }

  vec2 lookupPt = (vec2(vPtPos.x + frameSizeF.x, vPtPos.y) + vec2(0.5)) / vec2(texSize);
  vec3 currColor = texture2D(texImg, lookupPt).rgb;
  vec3 whiteColor = vec3(1.0, 1.0, 1.0);

  gl_FragColor = vec4(whiteColor, opacity);
}
