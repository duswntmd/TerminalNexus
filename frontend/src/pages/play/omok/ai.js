/**
 * 오목 AI (Web Worker 에서 실행 — ai.worker.js)
 *
 *  - 한 줄 모양 분류표: 놓으려는 칸 양옆 5칸씩(3^10 가지)을 미리 분류해 두고 조회 (5·열린4·4·열린3·3·2)
 *  - 쉬움: 한 수 앞만 보고 점수에 큰 무작위를 섞음
 *  - 보통: 짧은 VCF(연속 4) + 2~4수 알파베타 (0.45초)
 *  - 어려움: VCF(연속 4로 이기는 수순) → 내 수 뒤 상대 VCF 가 생기는 수 제외
 *            → 위협 순으로 정렬한 알파베타를 시간 안에서 반복 심화. 4에 대한 응수는 깊이를 쓰지 않고 연장
 *  - 금수는 engine.js 로 정확히 판정 (렌주의 백은 흑이 막을 자리가 금수인 4로 이기는 "금수 유도"도 본다)
 */
import {
  SIZE, CELLS, BLACK, WHITE, forbiddenReason, needsExactFive, isRestricted,
} from './engine.js';

// 테두리를 5칸 두른 판: 줄을 읽을 때 범위 검사가 필요 없다
const PW = SIZE + 10;
const pOf = (idx) => (((idx / SIZE) | 0) + 5) * PW + (idx % SIZE) + 5;
const PDIRS = [1, PW, PW + 1, PW - 1];
const P_OF = Array.from({ length: CELLS }, (_, i) => pOf(i));

// 한 줄 모양 (값이 클수록 강함)
const NONE = 0;
const S2 = 1; // 막힌 2
const T2 = 2; // 열린 2
const S3 = 3; // 막힌 3 (한 수로 4)
const T3 = 4; // 열린 3 (한 수로 열린 4)
const FOUR = 5; // 4 (5목 완성점 1개)
const DBL4 = 6; // 한 줄 4-4 (완성점 2개, 떨어져 있음)
const F4 = 7; // 열린 4
const FIVE = 8;
const OVER = 9; // 장목 (정확히 5목이어야 하는 쪽에게는 승리가 아님)

const TABLES = [new Int8Array(59049).fill(-1), new Int8Array(59049).fill(-1)];

/* ── 한 줄(11칸, 가운데 a[5] 가 내 돌) 분류 ── */
const classifyLine = (a, exact) => {
  const run = (i) => {
    let s = i;
    let e = i;
    while (s > 0 && a[s - 1] === 1) s -= 1;
    while (e < 10 && a[e + 1] === 1) e += 1;
    return [s, e];
  };
  const wins = (len) => (exact ? len === 5 : len >= 5);
  const fives = () => {
    const [s, e] = run(5);
    const pts = [];
    for (const q of [s - 1, e + 1]) {
      if (q < 0 || q > 10 || a[q] !== 0) continue;
      a[q] = 1;
      const [s2, e2] = run(q);
      a[q] = 0;
      if (wins(e2 - s2 + 1)) pts.push(q);
    }
    return pts;
  };
  // 0: 없음, 1: 4, 2: 열린 4
  const fourLevel = () => {
    const [s, e] = run(5);
    if (e - s + 1 >= 5) return 0;
    const f = fives();
    if (f.length === 2 && f[1] - f[0] === 5) return 2;
    return f.length ? 1 : 0;
  };
  // 한 수 더 두었을 때의 최고 수준 (0 없음, 1 막힌3, 2 열린3)
  const threeLevel = () => {
    let best = 0;
    for (let q = 1; q <= 9 && best < 2; q += 1) {
      if (a[q] !== 0) continue;
      a[q] = 1;
      const lv = fourLevel();
      a[q] = 0;
      if (lv > best) best = lv;
    }
    return best;
  };

  const [s, e] = run(5);
  const len = e - s + 1;
  if (wins(len)) return FIVE;
  if (len >= 5) return OVER;
  const f = fives();
  if (f.length === 2) return f[1] - f[0] === 5 ? F4 : DBL4;
  if (f.length === 1) return FOUR;
  const t = threeLevel();
  if (t === 2) return T3;
  if (t === 1) return S3;
  let best = 0;
  for (let q = 1; q <= 9 && best < 2; q += 1) {
    if (a[q] !== 0) continue;
    a[q] = 1;
    const lv = fourLevel() === 0 ? threeLevel() : 0;
    a[q] = 0;
    if (lv > best) best = lv;
  }
  return best === 2 ? T2 : best === 1 ? S2 : NONE;
};

const lineBuf = new Int8Array(11);
const lookup = (code, exact) => {
  const table = TABLES[exact ? 1 : 0];
  let v = table[code];
  if (v >= 0) return v;
  let c = code;
  for (let i = 10; i >= 0; i -= 1) {
    if (i === 5) { lineBuf[5] = 1; continue; }
    lineBuf[i] = c % 3;
    c = (c - (c % 3)) / 3;
  }
  v = classifyLine(lineBuf, exact);
  table[code] = v;
  return v;
};

const WIN = 10000000;
const W_SHAPE = [0, 3, 14, 16, 120, 140, 0, 0, 0, 0];

/** 탐색기: 판 하나를 두고 두었다 물렀다 하며 계산 */
export class Searcher {
  constructor(rule, moves = []) {
    this.rule = rule;
    this.pb = new Int8Array(PW * PW).fill(3);
    for (let i = 0; i < CELLS; i += 1) this.pb[P_OF[i]] = 0;
    this.board = new Int8Array(CELLS); // 금수 정밀 판정용 (engine.js)
    this.near = new Int16Array(CELLS); // 주변 2칸 안의 돌 개수
    this.count = 0;
    this.exact = [false, needsExactFive(rule, BLACK), needsExactFive(rule, WHITE)];
    this.restricted = [false, isRestricted(rule, BLACK), isRestricted(rule, WHITE)];
    this.nodes = 0;
    this.deadline = Infinity;
    this.aborted = false;
    // moveValue 결과 (전역처럼 사용)
    this.vFive = false;
    this.vFours = 0;
    this.vThrees = 0;
    this.vWin4 = false;
    moves.forEach((idx, i) => this.put(idx, i % 2 === 0 ? BLACK : WHITE));
  }

  put(idx, color) {
    this.pb[P_OF[idx]] = color;
    this.board[idx] = color;
    this.count += 1;
    this.touch(idx, 1);
  }

  take(idx) {
    this.pb[P_OF[idx]] = 0;
    this.board[idx] = 0;
    this.count -= 1;
    this.touch(idx, -1);
  }

  touch(idx, delta) {
    const x = idx % SIZE;
    const y = (idx / SIZE) | 0;
    for (let dy = -2; dy <= 2; dy += 1) {
      const ny = y + dy;
      if (ny < 0 || ny >= SIZE) continue;
      for (let dx = -2; dx <= 2; dx += 1) {
        const nx = x + dx;
        if (nx < 0 || nx >= SIZE) continue;
        this.near[ny * SIZE + nx] += delta;
      }
    }
  }

  shape(p, d, color) {
    const { pb } = this;
    const step = PDIRS[d];
    let code = 0;
    for (let k = -5; k <= 5; k += 1) {
      if (k === 0) continue;
      const c = pb[p + k * step];
      code = code * 3 + (c === 0 ? 0 : c === color ? 1 : 2);
    }
    return lookup(code, this.exact[color]);
  }

  /**
   * 빈칸 idx 에 color 가 두었을 때의 가치. 금수면 -1.
   * 부가 결과: vFive(5목), vFours(4 개수), vThrees(열린 3 개수), vWin4(다음 수에 막을 수 없는 4)
   */
  moveValue(idx, color) {
    const p = P_OF[idx];
    let five = false;
    let fours = 0;
    let threes = 0;
    let open4 = false;
    let over = false;
    let score = 0;
    for (let d = 0; d < 4; d += 1) {
      const s = this.shape(p, d, color);
      if (s === NONE) continue;
      if (s === FIVE) five = true;
      else if (s === OVER) over = true;
      else if (s === F4) { fours += 1; open4 = true; } else if (s === DBL4) fours += 2;
      else if (s === FOUR) fours += 1;
      else if (s === T3) threes += 1;
      score += W_SHAPE[s];
    }
    this.vFive = five;
    this.vFours = fours;
    this.vThrees = threes;
    this.vWin4 = false;
    if (five) return WIN;
    if (this.restricted[color]) {
      if (this.rule === 'renju' && (over || fours >= 2)) return -1;
      // 3-3 은 거짓 금수(열린 4 자리가 금수인 3)가 있어 엔진으로 정밀 판정
      if (threes >= 2 && forbiddenReason(this.board, idx, color, this.rule) === 'three3') return -1;
    }
    if (open4 || fours >= 2) { this.vWin4 = true; return 1000000; }
    if (fours === 1 && threes >= 1) return 400000;
    if (threes >= 2) return 80000;
    return score;
  }

  /**
   * me 차례의 판을 훑어 후보 수와 위협을 모은다.
   * cand: { idx, my, op, fours } — my/op 는 그 칸에 나/상대가 둘 때의 가치(금수면 -1)
   */
  scan(me) {
    const op = 3 - me;
    const cand = [];
    let myFive = -1;
    const opFives = [];
    let myWin4 = -1;
    const { near, board } = this;
    for (let idx = 0; idx < CELLS; idx += 1) {
      if (board[idx] !== 0 || near[idx] === 0) continue;
      const my = this.moveValue(idx, me);
      const myFours = this.vFours;
      const myFiveHere = this.vFive;
      const myWin4Here = this.vWin4;
      const o = this.moveValue(idx, op);
      if (this.vFive) opFives.push(idx);
      if (myFiveHere && myFive < 0) myFive = idx;
      if (myWin4Here && myWin4 < 0) myWin4 = idx;
      cand.push({ idx, my, op: o, fours: myFours });
    }
    return { cand, myFive, opFives, myWin4 };
  }

  timeUp() {
    this.nodes += 1;
    if ((this.nodes & 255) === 0 && Date.now() > this.deadline) this.aborted = true;
    return this.aborted;
  }

  /**
   * VCF: me 가 4를 연달아 두어 이기는 수순이 있으면 첫 수, 없으면 -1
   */
  vcf(me, depth) {
    if (this.timeUp() || this.vcfNodes <= 0) return -1;
    this.vcfNodes -= 1;
    const op = 3 - me;
    const info = this.scan(me);
    if (info.myFive >= 0) return info.myFive;
    if (depth <= 0) return -1;
    let moves;
    if (info.opFives.length) {
      // 상대 4를 막으면서 동시에 내 4가 되어야 수순이 이어진다
      if (info.opFives.length > 1) return -1;
      const c = info.cand.find((m) => m.idx === info.opFives[0]);
      if (!c || c.my < 0 || c.fours === 0) return -1;
      moves = [c];
    } else {
      if (info.myWin4 >= 0) return info.myWin4;
      moves = info.cand.filter((m) => m.fours > 0 && m.my >= 0).sort((a, b) => b.my - a.my);
    }
    for (const m of moves) {
      this.put(m.idx, me);
      // 내 5목 완성점 = 상대가 막아야 할 자리
      const reply = this.scan(op);
      let won = false;
      if (reply.myFive < 0) { // 상대가 먼저 5목을 두면 실패
        const blocks = reply.opFives;
        if (blocks.length >= 2) won = true;
        else if (blocks.length === 1) {
          const b = reply.cand.find((c) => c.idx === blocks[0]);
          if (b.my < 0) won = true; // 막을 자리가 상대의 금수
          else {
            this.put(b.idx, op);
            won = this.vcf(me, depth - 1) >= 0;
            this.take(b.idx);
          }
        }
      }
      this.take(m.idx);
      if (won) return m.idx;
      if (this.aborted) return -1;
    }
    return -1;
  }

  findVcf(me, depth, nodeLimit) {
    this.vcfNodes = nodeLimit;
    return this.vcf(me, depth);
  }

  evaluate(info) {
    let mine = 0;
    let theirs = 0;
    for (const c of info.cand) {
      if (c.my > 0) mine += c.my > 3000 ? 3000 : c.my;
      if (c.op > 0) theirs += c.op > 3000 ? 3000 : c.op;
    }
    return Math.round(mine * 1.15 - theirs);
  }

  ordered(info, width) {
    const list = [];
    for (const c of info.cand) {
      if (c.my < 0) continue;
      list.push({ idx: c.idx, key: c.my + (c.op > 0 ? c.op * 0.9 : 0), four: c.fours > 0 });
    }
    list.sort((a, b) => b.key - a.key);
    if (list.length <= width) return list;
    // 폭으로 자르더라도 4를 만드는 수(강제수)는 빼지 않는다.
    // 빠지면 상대의 반격 4를 못 보고 "이겼다"고 착각한다.
    const out = list.slice(0, width);
    let extra = 0;
    for (let i = width; i < list.length && extra < 4; i += 1) {
      if (list[i].four) { out.push(list[i]); extra += 1; }
    }
    return out;
  }

  negamax(me, depth, alpha, beta, ply) {
    if (this.timeUp()) return 0;
    const info = this.scan(me);
    if (info.myFive >= 0) return WIN - ply;
    let moves;
    let forced = false;
    if (info.opFives.length) {
      const legal = info.opFives.filter((idx) => info.cand.find((c) => c.idx === idx).my >= 0);
      if (!legal.length) return -(WIN - ply - 1); // 막을 자리가 금수
      moves = [{ idx: legal[0] }];
      forced = true;
    } else {
      if (info.myWin4 >= 0) return WIN - ply - 2;
      if (!info.cand.length) return 0;
      if (depth <= 0) {
        // 깊이가 다해도, 상대가 다음 수에 열린 4를 만들 수 있으면(열린 3이 있으면) 평가하지 않고
        // 막는 수와 내 4만 더 읽는다 → 얕은 탐색에서도 3-3·4-3 을 놓치지 않는다
        if (ply >= this.maxPly || !info.cand.some((c) => c.op >= 1000000)) return this.evaluate(info);
        moves = info.cand.filter((c) => c.my >= 0 && (c.op >= 1000000 || c.fours > 0))
          .sort((a, b) => (b.op + b.my) - (a.op + a.my));
        if (!moves.length) return -(WIN - ply - 3);
        forced = true;
      } else {
        moves = this.ordered(info, this.width);
        if (!moves.length) return 0; // 둘 곳이 모두 금수
      }
    }
    let best = -Infinity;
    for (const m of moves) {
      this.put(m.idx, me);
      const v = -this.negamax(3 - me, forced && ply < this.maxPly ? depth : depth - 1, -beta, -alpha, ply + 1);
      this.take(m.idx);
      if (this.aborted) return 0;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }
}

const CENTER = 7 * SIZE + 7;

const openingMove = (moves, rng) => {
  if (moves.length === 0) return CENTER;
  if (moves.length === 1) {
    // 첫 수 바로 옆(직접·간접)으로 붙인다
    const x = moves[0] % SIZE;
    const y = (moves[0] / SIZE) | 0;
    const opts = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if ((dx || dy) && nx >= 2 && ny >= 2 && nx < SIZE - 2 && ny < SIZE - 2) opts.push(ny * SIZE + nx);
      }
    }
    if (opts.length) return opts[Math.floor(rng() * opts.length)];
    return CENTER;
  }
  return -1;
};

const LEVELS = {
  easy: { time: 0 },
  normal: { time: 450, width: 8, depths: [2, 4], vcfDepth: 4, vcfNodes: 1500, guard: 0 },
  hard: { time: 1100, width: 9, rootWidth: 14, depths: [2, 4, 6, 8, 10], vcfDepth: 16, vcfNodes: 40000, guard: 12 },
};

/**
 * 다음 수 고르기
 * @param {string} rule  renju | standard | free
 * @param {number[]} moves 지금까지의 수순 (흑부터)
 * @param {string} level easy | normal | hard
 * @param {{time?: number, rng?: () => number}} opts time: 생각 시간(ms) 덮어쓰기 (시험용)
 * @returns {{ move: number, info: string }}
 */
export const chooseMove = (rule, moves, level = 'normal', opts = {}) => {
  const rng = opts.rng || Math.random;
  const cfg = LEVELS[level] || LEVELS.normal;
  const me = moves.length % 2 === 0 ? BLACK : WHITE;
  const op = 3 - me;

  const first = openingMove(moves, rng);
  if (first >= 0) return { move: first, info: 'opening' };

  const s = new Searcher(rule, moves);
  const info = s.scan(me);
  const legal = info.cand.filter((c) => c.my >= 0);
  if (!legal.length) {
    // 주변 후보가 모두 금수: 판 전체에서 둘 수 있는 곳을 찾는다
    for (let idx = 0; idx < CELLS; idx += 1) {
      if (s.board[idx] === 0 && forbiddenReason(s.board, idx, me, rule) === null) return { move: idx, info: 'any' };
    }
    return { move: -1, info: 'none' };
  }
  if (info.myFive >= 0) return { move: info.myFive, info: 'five' };
  const blocks = info.opFives.filter((idx) => legal.some((c) => c.idx === idx));
  if (blocks.length) return { move: blocks[0], info: 'block5' };

  if (level === 'easy') {
    // 한 수 앞만: 공격 위주, 수비는 덜 보고, 점수에 큰 무작위. 열린 4 는 놓치지 않는다
    let best = legal[0];
    let bestKey = -Infinity;
    for (const c of legal) {
      const opv = c.op > 0 ? c.op : 0;
      const key = (Math.min(c.my, 2000000) + Math.min(opv, 1000000) * 0.45) * (0.45 + rng() * 1.1) + rng() * 12;
      if (key > bestKey) { bestKey = key; best = c; }
    }
    return { move: best.idx, info: 'greedy' };
  }

  const started = Date.now();
  const total = opts.time ?? cfg.time;
  s.deadline = started + total;

  // 1) 연속 4로 이기는 수순
  if (info.myWin4 >= 0) return { move: info.myWin4, info: 'win4' };
  s.deadline = started + total * 0.3;
  const v = s.findVcf(me, cfg.vcfDepth, cfg.vcfNodes);
  if (v >= 0 && !s.aborted) return { move: v, info: 'vcf' };
  s.aborted = false;

  // 2) 후보 정렬
  s.width = cfg.width;
  s.maxPly = 18;
  let root = s.ordered(info, cfg.rootWidth || cfg.width);
  // 같은 점수면 순서를 살짝 섞어 매번 같은 판이 되지 않게
  root.forEach((m) => { m.key += rng() * 2; });
  root.sort((a, b) => b.key - a.key);

  // 3) 내 수 뒤에 상대가 연속 4로 이기는 수는 뺀다
  if (cfg.guard) {
    s.deadline = started + total * 0.6;
    const safe = [];
    for (let i = 0; i < root.length; i += 1) {
      if (i >= cfg.guard || s.aborted) { safe.push(root[i]); continue; }
      s.put(root[i].idx, me);
      const lose = s.findVcf(op, 12, 4000) >= 0 && !s.aborted;
      s.take(root[i].idx);
      if (!lose) safe.push(root[i]);
    }
    s.aborted = false;
    if (safe.length) root = safe;
  }
  if (root.length === 1) return { move: root[0].idx, info: 'only' };

  // 4) 알파베타 반복 심화
  s.deadline = started + total;
  let bestMove = root[0].idx;
  let reached = 0;
  for (const depth of cfg.depths) {
    let alpha = -Infinity;
    let iterBest = -1;
    const scores = new Map();
    for (const m of root) {
      s.put(m.idx, me);
      const val = -s.negamax(op, depth - 1, -Infinity, -alpha, 1);
      s.take(m.idx);
      if (s.aborted) break;
      scores.set(m.idx, val);
      if (val > alpha) { alpha = val; iterBest = m.idx; }
    }
    if (s.aborted) {
      // 중간에 끊긴 깊이: 이전 최선보다 좋은 수를 이미 찾았을 때만 채택
      if (reached === 0) { if (iterBest >= 0) bestMove = iterBest; } else if (iterBest >= 0 && iterBest !== bestMove && scores.has(bestMove) && alpha > scores.get(bestMove)) bestMove = iterBest;
      break;
    }
    bestMove = iterBest;
    reached = depth;
    // 다음 깊이는 이번 평가가 좋은 수부터 (가지치기가 잘 됨)
    root.sort((a, b) => (scores.get(b.idx) ?? -Infinity) - (scores.get(a.idx) ?? -Infinity));
    if (alpha >= WIN - 100 || alpha <= -(WIN - 100)) break;
    if (Date.now() - started > total * 0.55) break;
  }
  return { move: bestMove, info: `d${reached}` };
};
