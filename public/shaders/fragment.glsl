varying float vVertexIdx;
varying vec2 vPtPos;
varying float vShouldDiscard;

uniform float opacity;
uniform float saturation;
uniform vec3 singleColorVec;
uniform bool useSingleColor;
uniform ivec2 texSize;
uniform sampler2D texImg;

void main() {
  vec2 frameSizeF = vec2(texSize.x / 2, texSize.y);
  ivec2 frameSize = ivec2(frameSizeF);

  int vertIdx = int(vVertexIdx);
  int actualNumPts = frameSize.x * frameSize.y;

  if (vShouldDiscard != 0.0 || vertIdx >= actualNumPts) {
    discard;
  }

  vec2 lookupPt = (vec2(vPtPos.x + frameSizeF.x, vPtPos.y) + vec2(0.5)) / vec2(texSize);
  vec3 currColor = texture2D(texImg, lookupPt).rgb;
  float greyLevel = (currColor.r + currColor.g + currColor.b) / 3.0;
  vec3 greyColor = vec3(greyLevel, greyLevel, greyLevel);
  vec3 saturatedColor = mix(greyColor, currColor, saturation / 3.0);
  vec3 singleColor = mix(greyColor, singleColorVec, saturation / 3.0);

  gl_FragColor = vec4(useSingleColor ? singleColor : saturatedColor, opacity);
}
