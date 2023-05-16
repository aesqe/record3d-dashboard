attribute float vertexIdx;

varying float vVertexIdx;
varying vec2 vPtPos;
varying float vShouldDiscard;

uniform ivec2 texSize;
uniform sampler2D texImg;
uniform vec4 iK;
uniform float scale;
uniform float ptSize;
uniform int renderNthPoint;
uniform float seed1;
uniform float seed2;
uniform float seed3;
uniform bool useNoise;
uniform float noiseStrength;
uniform float transitionTime;

// Filtering constants
const int filterSize = 1;
const float depthThresholdFilter = 0.005; // In meters. Smaller values = more aggressive filtering
const vec2 absoluteDepthRangeFilter = vec2(0.1, 2.8);

float random(vec2 st, float seed) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) *
    43758.5453123) * seed * noiseStrength * noiseStrength;
}

// Modified "rgb2hsv()" from this source: https://stackoverflow.com/a/17897228
float rgb2hue(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return abs(q.z + (q.w - q.y) / (6.0 * d + e));
}

float getPixelDepth(ivec2 pixel) {
  vec2 lookupPt = (vec2(pixel) + vec2(0.5)) / vec2(texSize);
  float hue = rgb2hue(texture2D(texImg, lookupPt).rgb);
  float pixelDepth = 3.0 * hue;
  return pixelDepth;
}

bool shouldDiscard(ivec2 currPixel, int vertIdx) {
  float centerPixelDepth = getPixelDepth(currPixel);

  for (int i = -filterSize; i <= filterSize; i++) for (int j = -filterSize; j <= filterSize; j++) {
      if (i == 0 && j == 0)
        continue;

      float currDepth = getPixelDepth(currPixel + ivec2(j, i));

      if (currDepth < absoluteDepthRangeFilter.x || currDepth >= absoluteDepthRangeFilter.y || abs(centerPixelDepth - currDepth) > depthThresholdFilter) {
        return true;
      }
    }

  if (vertIdx > 0 && vertIdx % renderNthPoint != 0) {
    return true;
  }

  return false;
}

void main() {
  vShouldDiscard = 0.0;

  ivec2 frameSize = ivec2(texSize.x / 2, texSize.y);
  int vertIdx = int(vertexIdx);

  int actualNumPts = frameSize.x * frameSize.y;

  if (vertIdx >= actualNumPts) {
    vShouldDiscard = 1.0;
    gl_Position = vec4(0.0);
    return;
  }

  int ptY = vertIdx / int(frameSize.x);
  int ptX = vertIdx - ptY * int(frameSize.x);
  ivec2 pt = ivec2(ptX, ptY);

  if (shouldDiscard(pt, vertIdx)) {
    vShouldDiscard = 1.0;
    gl_Position = vec4(0.0);
    return;
  }

  float currDepth = getPixelDepth(pt) * 2.0;

  vec3 coords = vec3((iK.x * float(ptX) + iK.z) * currDepth, (iK.y * float(ptY) + iK.w) * currDepth, -currDepth);

  float noisex = useNoise ? random(vec2(coords.x, coords.y), seed1) : 0.0;
  float noisey = useNoise ? random(vec2(coords.y, coords.z), seed2) : 0.0;
  float noisez = useNoise ? random(vec2(coords.z, coords.x), seed3) : 0.0;

  vec3 ptPos = scale * (vec3(coords.x + noisex, coords.y + noisey, coords.z + noisez));

  vec4 mvPos = modelViewMatrix * vec4(ptPos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  vPtPos = vec2(float(ptX), float(ptY));
  vVertexIdx = vertexIdx;
  gl_PointSize = ptSize;
}
