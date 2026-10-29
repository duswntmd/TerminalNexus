// 해커 모드 데이터 — 전부 허구의 연출용 소품. 실제 동작하는 것은 없다.

export const SCENARIOS = [
  { id: 'bank', name: '제네바 은행 금고망', target: 'VAULT-CORE', city: 'geneva', pass: 'SWISSGOLD', difficulty: 1 },
  { id: 'sat', name: '궤도 위성 관제소', target: 'ORBIT-CTRL', city: 'houston', pass: 'APOLLO11X', difficulty: 2 },
  { id: 'casino', name: '마카오 카지노 감시망', target: 'EYE-IN-SKY', city: 'macau', pass: 'LUCKY7777', difficulty: 2 },
  { id: 'lab', name: '남극 기지 연구 서버', target: 'ICE-LAB-09', city: 'mcmurdo', pass: 'ZEROKELVN', difficulty: 3 },
];

export const STAGES = ['대상 정찰', '연결 수립', '권한 확인', '데이터 수신', '세션 종료'];

// 위도·경도 (프록시 경유지)
export const CITIES = {
  seoul: [37.5, 127], tokyo: [35.7, 139.7], singapore: [1.35, 103.8], mumbai: [19, 72.8],
  frankfurt: [50.1, 8.7], london: [51.5, -0.1], reykjavik: [64.1, -21.9], saopaulo: [-23.5, -46.6],
  newyork: [40.7, -74], losangeles: [34, -118.2], sydney: [-33.9, 151.2], capetown: [-33.9, 18.4],
  moscow: [55.8, 37.6], dubai: [25.2, 55.3], geneva: [46.2, 6.1], houston: [29.8, -95.4],
  macau: [22.2, 113.5], mcmurdo: [-60, 166.7], nairobi: [-1.3, 36.8], anchorage: [61.2, -149.9],
};

// 대륙 윤곽 (대략적인 [경도, 위도] 다각형) → 점 지도로 그린다
export const LAND = [
  [[-168, 65], [-140, 70], [-95, 72], [-75, 62], [-60, 50], [-80, 25], [-97, 17], [-82, 8], [-105, 20], [-117, 32], [-125, 48], [-150, 58]],
  [[-50, 82], [-20, 76], [-40, 60], [-55, 70]],
  [[-80, 10], [-60, 8], [-35, -6], [-40, -22], [-58, -38], [-68, -55], [-75, -45], [-72, -18], [-81, -5]],
  [[-10, 36], [-9, 44], [0, 50], [5, 58], [10, 63], [25, 71], [40, 68], [45, 55], [30, 45], [28, 40], [15, 38], [0, 38]],
  [[-6, 50], [2, 51], [-2, 58], [-6, 56]],
  [[-17, 15], [-10, 35], [10, 37], [32, 31], [43, 12], [51, 12], [40, -10], [35, -25], [20, -35], [12, -18], [9, 4], [-8, 5]],
  [[28, 40], [40, 68], [70, 73], [110, 77], [140, 72], [170, 66], [180, 65], [160, 58], [140, 50], [130, 35], [122, 30], [120, 22], [108, 10], [100, 1], [95, 15], [80, 8], [72, 20], [60, 25], [50, 30], [35, 35]],
  [[130, 31], [142, 44], [141, 36]],
  [[95, 5], [105, -6], [120, -9], [141, -8], [130, -1], [118, 1], [104, 2]],
  [[113, -22], [130, -12], [142, -11], [153, -27], [146, -39], [135, -35], [115, -34]],
  [[166, -45], [174, -36], [178, -38], [170, -46]],
  [[-180, -64], [180, -64], [180, -60], [-180, -60]],
];

const inPoly = (x, y, poly) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]; const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

export function landDots(step = 4) {
  const dots = [];
  for (let lat = 80; lat >= -64; lat -= step) {
    for (let lon = -178; lon <= 180; lon += step) {
      if (LAND.some((p) => inPoly(lon, lat, p))) dots.push([lon, lat]);
    }
  }
  return dots;
}

// 화면 좌표 (equirectangular, 위도 84 ~ -66)
export const project = ([lat, lon], w, h) => [((lon + 180) / 360) * w, ((84 - lat) / 150) * h];

// 스크롤용 "코드" — 영화처럼 흘러가게만 하는 평범하고 무해한 교과서 예제들.
// (정렬·피보나치·행렬 곱 같은 일반 알고리즘일 뿐, 실제로 아무 일도 하지 않음)
export const CODE = {
  render: `// render_loop.c — 데모 씬 렌더러
#include <math.h>
#include <stdint.h>

typedef struct { float x, y, z; } vec3;

static vec3 rotate(vec3 p, float a) {
    float c = cosf(a), s = sinf(a);
    return (vec3){ p.x * c - p.z * s, p.y, p.x * s + p.z * c };
}

void draw_frame(uint32_t *buf, int w, int h, float t) {
    for (int y = 0; y < h; y++) {
        for (int x = 0; x < w; x++) {
            float u = (float)x / w - 0.5f;
            float v = (float)y / h - 0.5f;
            vec3 p = rotate((vec3){ u, v, 1.0f }, t);
            float d = sqrtf(p.x * p.x + p.y * p.y);
            uint8_t c = (uint8_t)(128.0f + 127.0f * sinf(d * 18.0f - t * 3.0f));
            buf[y * w + x] = (c << 8) | 0x001000;
        }
    }
}
`,
  python: `#!/usr/bin/env python3
# toolbox.py — 흔한 교과서 알고리즘 모음
from functools import lru_cache

def quicksort(a):
    if len(a) <= 1:
        return a
    pivot = a[len(a) // 2]
    left  = [x for x in a if x < pivot]
    mid   = [x for x in a if x == pivot]
    right = [x for x in a if x > pivot]
    return quicksort(left) + mid + quicksort(right)

@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

def matmul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(len(b)))
             for j in range(len(b[0]))] for i in range(len(a))]

def sieve(limit):
    ok = [True] * (limit + 1)
    for p in range(2, int(limit ** 0.5) + 1):
        if ok[p]:
            for m in range(p * p, limit + 1, p):
                ok[m] = False
    return [p for p in range(2, limit + 1) if ok[p]]

if __name__ == "__main__":
    print(quicksort([9, 3, 7, 1, 8, 2, 5]))
    print([fib(n) for n in range(12)])
    print(sieve(40))
`,
  go: `// pipeline.go — 숫자를 받아 제곱해 흘려보내는 파이프라인
package main

import "fmt"

func gen(nums ...int) <-chan int {
    out := make(chan int)
    go func() {
        for _, n := range nums {
            out <- n
        }
        close(out)
    }()
    return out
}

func sq(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        for n := range in {
            out <- n * n
        }
        close(out)
    }()
    return out
}

func main() {
    for v := range sq(sq(gen(2, 3, 4))) {
        fmt.Println(v)
    }
}
`,
};

// "진척 로그"에 흘릴 허구의 상태 메시지 (연출용, 실제 동작 없음)
export const LOG_LINES = [
  'resolving relay nodes ... 5 hops selected',
  'opening tunnel  seoul -> tokyo -> frankfurt',
  'tls handshake   AES-256-GCM   [ok]',
  'syncing clock drift  +0.3ms',
  'buffer window   65535 bytes',
  'packet 0x1f3a   routed',
  'packet 0x1f3b   routed',
  'heartbeat   alive   latency 42ms',
  'decoding stream frame  #%n',
  'checksum verified  crc32 match',
  'handshake renegotiated',
  'relay node reykjavik  healthy',
  'reassembling fragments  12 / 12',
  'cache warmed   hit-rate 0.98',
  'telemetry flushed',
];
