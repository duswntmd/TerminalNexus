/* 리버시 AI: 알파베타 탐색 + 위치 가중치·기동력·확정돌 평가, 막판은 끝까지 읽어 돌 수 차이로 판단.
 * 화면은 ai.worker.js 로 별도 스레드에서 부른다.
 */
import { CELLS, EMPTY, flipsFor, legalMoves } from './engine.js';

// 칸 가중치: 귀(+), 귀 옆 X·C 칸(-), 가장자리(+)
const W = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
];
const CORNERS = [[0, 1, 8, 9], [7, 6, 15, 14], [56, 57, 48, 49], [63, 62, 55, 54]];

export const LEVELS = {
  easy: { depth: 1, exact: 0, noise: 60, time: 0 },
  normal: { depth: 3, exact: 8, noise: 6, time: 400 },
  hard: { depth: 12, exact: 14, noise: 0, time: 1000 },
};

const WIN = 100000;

const empties = (b) => {
  let n = 0;
  for (let i = 0; i < CELLS; i += 1) if (b[i] === EMPTY) n += 1;
  return n;
};

/** 귀를 차지한 뒤에는 그 옆 X·C 칸이 더 이상 나쁘지 않다 */
const evaluate = (b, me) => {
  const op = 3 - me;
  let pos = 0;
  for (let i = 0; i < CELLS; i += 1) {
    if (b[i] === me) pos += W[i];
    else if (b[i] === op) pos -= W[i];
  }
  for (const [c, ...near] of CORNERS) {
    if (b[c] === EMPTY) continue;
    for (const n of near) {
      if (b[n] === me) pos -= W[n] - 5; // 가중치를 상쇄
      else if (b[n] === op) pos += W[n] - 5;
    }
  }
  const myMob = legalMoves(b, me).length;
  const opMob = legalMoves(b, op).length;
  const mob = myMob + opMob ? (100 * (myMob - opMob)) / (myMob + opMob + 2) : 0;
  let discs = 0;
  for (let i = 0; i < CELLS; i += 1) discs += b[i] === me ? 1 : b[i] === op ? -1 : 0;
  const e = empties(b);
  // 판이 찰수록 돌 수의 비중을 키운다
  return pos + mob * 1.6 + discs * (e < 16 ? 3 : 0);
};

const discDiff = (b, me) => {
  let d = 0;
  for (let i = 0; i < CELLS; i += 1) d += b[i] === me ? 1 : b[i] === 3 - me ? -1 : 0;
  return d;
};

class Search {
  constructor(deadline) {
    this.deadline = deadline;
    this.nodes = 0;
    this.aborted = false;
  }

  ordered(b, color) {
    return legalMoves(b, color).sort((a, c) => W[c] - W[a]);
  }

  negamax(b, color, depth, alpha, beta, exact, passed = false) {
    this.nodes += 1;
    if ((this.nodes & 1023) === 0 && this.deadline && Date.now() > this.deadline) this.aborted = true;
    if (this.aborted) return 0;
    const moves = this.ordered(b, color);
    if (!moves.length) {
      if (passed) {
        const d = discDiff(b, color);
        return d > 0 ? WIN + d : d < 0 ? -WIN + d : 0;
      }
      return -this.negamax(b, 3 - color, depth, -beta, -alpha, exact, true);
    }
    if (!exact && depth <= 0) return evaluate(b, color);
    let best = -Infinity;
    for (const m of moves) {
      const flips = flipsFor(b, m, color);
      b[m] = color;
      for (const f of flips) b[f] = color;
      const v = -this.negamax(b, 3 - color, depth - 1, -beta, -alpha, exact);
      b[m] = EMPTY;
      for (const f of flips) b[f] = 3 - color;
      if (this.aborted) return 0;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }
}

/**
 * 다음 수 고르기
 * @param {Int8Array|number[]} board
 * @param {number} color 둘 차례
 * @param {'easy'|'normal'|'hard'} level
 * @param {{ rng?: () => number, time?: number }} opts
 * @returns {{ move: number, info: string }}
 */
export const chooseMove = (board, color, level = 'normal', opts = {}) => {
  const rng = opts.rng || Math.random;
  const cfg = LEVELS[level] || LEVELS.normal;
  const b = Int8Array.from(board);
  const moves = legalMoves(b, color);
  if (!moves.length) return { move: -1, info: 'pass' };
  if (moves.length === 1) return { move: moves[0], info: 'only' };

  const time = opts.time ?? cfg.time;
  const left = empties(b);
  const exact = cfg.exact && left <= cfg.exact;
  const s = new Search(time ? Date.now() + time : 0);

  const scoreAll = (depth) => {
    const scores = new Map();
    let alpha = -Infinity;
    const order = [...moves].sort((a, c) => (lastScores.get(c) ?? W[c]) - (lastScores.get(a) ?? W[a]));
    for (const m of order) {
      const flips = flipsFor(b, m, color);
      b[m] = color;
      for (const f of flips) b[f] = color;
      // 쉬움·보통은 동점 수를 고루 고르도록 창을 넓게 둔다
      const v = -s.negamax(b, 3 - color, depth - 1, -Infinity, cfg.noise ? Infinity : -alpha, exact);
      b[m] = EMPTY;
      for (const f of flips) b[f] = 3 - color;
      if (s.aborted) return null;
      scores.set(m, v);
      if (v > alpha) alpha = v;
    }
    return scores;
  };

  let lastScores = new Map();
  let reached = 0;
  if (exact) {
    const sc = scoreAll(64);
    if (sc) { lastScores = sc; reached = 64; }
  }
  if (!reached) {
    for (let d = 1; d <= cfg.depth; d += 1) {
      const sc = scoreAll(d);
      if (!sc) break;
      lastScores = sc;
      reached = d;
      if (!time && d >= cfg.depth) break;
      if (time && Date.now() > s.deadline - time * 0.45) break;
    }
  }
  if (!lastScores.size) return { move: moves[0], info: 'fallback' };

  let best = moves[0];
  let bestKey = -Infinity;
  for (const [m, v] of lastScores) {
    const key = v + (cfg.noise ? (rng() - 0.5) * cfg.noise * 2 : 0);
    if (key > bestKey) { bestKey = key; best = m; }
  }
  return { move: best, info: reached === 64 ? 'exact' : `d${reached}` };
};

