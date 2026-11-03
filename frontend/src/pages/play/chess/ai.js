/**
 * 체스 AI: 알파-베타(PVS) + 반복 심화(시간 제한) + 치환표 + 정지 탐색
 * 수 정렬은 치환표 수 → 잡는 수(MVV-LVA) → 킬러 수 → 히스토리 순서. Web Worker 에서 실행한다.
 */
import { Position, WHITE, PAWN, BISHOP, KING, FLAG_EP, toUci } from './engine.js';

export const LEVELS = {
  easy: { timeMs: 300, maxDepth: 1, noise: 220 },
  normal: { timeMs: 900, maxDepth: 4, noise: 30 },
  hard: { timeMs: 2500, maxDepth: 30, noise: 0 },
};

const VALUE = [0, 100, 320, 330, 500, 900, 0];
const MATE = 30000;
const INF = 32000;

/* 위치 점수 (백 기준, 0 = a8). 흑은 sq ^ 56 으로 뒤집어 적용 */
const PST = [
  null,
  [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
    0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30,
    -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10,
    -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
    -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
    0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
    -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
];
const KING_END = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30,
  -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];
const PHASE = [0, 0, 1, 1, 2, 4, 0];

const centerDist = (sq) => Math.max(3 - (sq >> 3), (sq >> 3) - 4, 0) + Math.max(3 - (sq & 7), (sq & 7) - 4, 0);
const kingDist = (a, b) => Math.max(Math.abs((a >> 3) - (b >> 3)), Math.abs((a & 7) - (b & 7)));

/** 평가 점수 (둘 차례 기준, 센티폰) */
export const evaluate = (pos) => {
  const b = pos.board;
  let mid = 0;
  let phase = 0;
  const bishops = [0, 0];
  for (let sq = 0; sq < 64; sq++) {
    const p = b[sq];
    if (!p) continue;
    const t = p & 7;
    if (t === KING) continue;
    const white = (p & 24) === WHITE;
    const v = VALUE[t] + PST[t][white ? sq : sq ^ 56];
    mid += white ? v : -v;
    phase += PHASE[t];
    if (t === BISHOP) bishops[white ? 0 : 1]++;
  }
  if (bishops[0] >= 2) mid += 30;
  if (bishops[1] >= 2) mid -= 30;
  // 킹: 중반에는 뒤에 숨고, 끝내기에는 가운데로 (기물 수로 섞음)
  const ph = Math.min(phase, 24);
  const wk = pos.kings[0];
  const bk = pos.kings[1];
  mid += Math.round((PST[KING][wk] * ph + KING_END[wk] * (24 - ph)) / 24);
  mid -= Math.round((PST[KING][bk ^ 56] * ph + KING_END[bk ^ 56] * (24 - ph)) / 24);
  // 끝내기에서 크게 앞서면 상대 킹을 구석으로 몰고 내 킹을 붙인다 (체크메이트 마무리)
  if (ph <= 8 && Math.abs(mid) > 300) {
    const winner = mid > 0 ? wk : bk;
    const loser = mid > 0 ? bk : wk;
    const mop = centerDist(loser) * 10 + (14 - kingDist(winner, loser)) * 4;
    mid += mid > 0 ? mop : -mop;
  }
  return pos.turn === WHITE ? mid : -mid;
};

/* 치환표 */
const TT_BITS = 19;
const TT_MASK = (1 << TT_BITS) - 1;
const ttKey = new Int32Array(1 << TT_BITS);
const ttMove = new Int32Array(1 << TT_BITS);
const ttScore = new Int16Array(1 << TT_BITS);
const ttDepth = new Int8Array(1 << TT_BITS);
const ttFlag = new Uint8Array(1 << TT_BITS); // 0 없음, 1 정확, 2 하한, 3 상한

class Timeout extends Error {}

/**
 * @param startFen 대국 시작 국면
 * @param ucis     지금까지 둔 수
 * @param levelKey easy | normal | hard
 * @returns {{ uci, depth, score, nodes }}
 */
export const search = (startFen, ucis, levelKey = 'normal') => {
  const level = LEVELS[levelKey] || LEVELS.normal;
  const pos = Position.fromFen(startFen);
  const history = [pos.hash]; // 반복 판정용 해시 (대국 기록 + 탐색 경로)
  for (const u of ucis) {
    const m = pos.legalMoves().find((x) => toUci(x) === u);
    if (m === undefined) throw new Error(`잘못된 기보: ${u}`);
    pos.make(m);
    history.push(pos.hash);
  }
  const rootLegal = pos.legalMoves();
  if (rootLegal.length === 0) return { uci: null };
  if (rootLegal.length === 1) return { uci: toUci(rootLegal[0]), depth: 0, score: 0, nodes: 0 };

  ttFlag.fill(0);
  const killers = new Int32Array(128 * 2);
  const hist = new Int32Array(64 * 64);
  const deadline = Date.now() + level.timeMs;
  let nodes = 0;

  const isRepeat = () => {
    const h = pos.hash;
    const stop = Math.max(0, history.length - 1 - pos.halfmove);
    for (let i = history.length - 3; i >= stop; i -= 2) if (history[i] === h) return true;
    return false;
  };

  const hasPieces = (color) => {
    for (let sq = 0; sq < 64; sq++) {
      const p = pos.board[sq];
      if (p && (p & 24) === color && (p & 7) !== PAWN && (p & 7) !== KING) return true;
    }
    return false;
  };

  const victimOf = (m) => (((m >> 15) & 3) === FLAG_EP ? PAWN : pos.board[(m >> 6) & 63] & 7);

  /** 수마다 정렬 점수를 매겨 내림차순 정렬 */
  const order = (moves, tt, ply) => {
    const scored = moves.map((m) => {
      if (m === tt) return [m, 1e7];
      const victim = victimOf(m);
      const promo = (m >> 12) & 7;
      if (victim || promo) return [m, 1e6 + VALUE[victim] * 10 + VALUE[promo] - (pos.board[m & 63] & 7)];
      if (m === killers[ply * 2]) return [m, 9e5];
      if (m === killers[ply * 2 + 1]) return [m, 8e5];
      return [m, hist[(m & 63) * 64 + ((m >> 6) & 63)]];
    });
    scored.sort((a, c) => c[1] - a[1]);
    return scored;
  };

  const tick = () => {
    if ((++nodes & 2047) === 0 && Date.now() > deadline) throw new Timeout();
  };

  const quiesce = (alpha, beta, ply) => {
    tick();
    const stand = evaluate(pos);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (ply > 60) return alpha;
    for (const [m] of order(pos.generate([], true), 0, Math.min(ply, 127))) {
      // 잡아도 판세를 뒤집지 못하는 수는 건너뜀 (델타 가지치기)
      if (stand + VALUE[victimOf(m)] + VALUE[(m >> 12) & 7] + 200 < alpha) continue;
      pos.make(m);
      if (!pos.leftKingSafe()) { pos.unmake(); continue; }
      const v = -quiesce(-beta, -alpha, ply + 1);
      pos.unmake();
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  };

  const negamax = (depth, alpha, beta, ply, allowNull) => {
    tick();
    if (ply > 0 && (pos.halfmove >= 100 || isRepeat())) return 0;
    const inCheck = pos.inCheck();
    if (inCheck) depth++;
    if (depth <= 0) return quiesce(alpha, beta, ply);
    if (ply >= 100) return evaluate(pos);

    const idx = pos.hash & TT_MASK;
    let tt = 0;
    if (ttFlag[idx] && ttKey[idx] === pos.hash) {
      tt = ttMove[idx];
      if (ttDepth[idx] >= depth) {
        let s = ttScore[idx];
        if (s > MATE - 500) s -= ply;
        else if (s < -MATE + 500) s += ply;
        const f = ttFlag[idx];
        if (f === 1 || (f === 2 && s >= beta) || (f === 3 && s <= alpha)) return s;
      }
    }

    // 널무브: 한 수 쉬어도 beta 이상이면 가지치기
    if (allowNull && !inCheck && depth >= 3 && beta < MATE - 500 && hasPieces(pos.turn) && evaluate(pos) >= beta) {
      pos.makeNull();
      history.push(pos.hash);
      const v = -negamax(depth - 3, -beta, -beta + 1, ply + 1, false);
      history.pop();
      pos.unmakeNull();
      if (v >= beta) return beta;
    }

    const alpha0 = alpha;
    let best = -INF;
    let bestMove = 0;
    let legal = 0;
    for (const [m] of order(pos.generate(), tt, ply)) {
      const quiet = !victimOf(m) && !((m >> 12) & 7);
      pos.make(m);
      if (!pos.leftKingSafe()) { pos.unmake(); continue; }
      legal++;
      history.push(pos.hash);
      let v;
      if (legal === 1) v = -negamax(depth - 1, -beta, -alpha, ply + 1, true);
      else {
        // 늦게 나온 조용한 수는 얕게 먼저 확인 (LMR)
        const r = legal > 4 && depth >= 3 && quiet && !inCheck && !pos.inCheck() ? 1 : 0;
        v = -negamax(depth - 1 - r, -alpha - 1, -alpha, ply + 1, true);
        if (v > alpha && (r || v < beta)) v = -negamax(depth - 1, -beta, -alpha, ply + 1, true);
      }
      history.pop();
      pos.unmake();
      if (v > best) { best = v; bestMove = m; }
      if (v > alpha) alpha = v;
      if (alpha >= beta) {
        if (quiet) {
          if (killers[ply * 2] !== m) { killers[ply * 2 + 1] = killers[ply * 2]; killers[ply * 2] = m; }
          hist[(m & 63) * 64 + ((m >> 6) & 63)] += depth * depth;
        }
        break;
      }
    }
    if (legal === 0) return inCheck ? -MATE + ply : 0;

    let store = best;
    if (store > MATE - 500) store += ply;
    else if (store < -MATE + 500) store -= ply;
    ttKey[idx] = pos.hash;
    ttMove[idx] = bestMove;
    ttScore[idx] = store;
    ttDepth[idx] = depth;
    ttFlag[idx] = best <= alpha0 ? 3 : best >= beta ? 2 : 1;
    return best;
  };

  // 루트: noise 가 있으면 최선 수와 noise 이내인 수들의 점수를 정확히 구해 무작위성을 섞는다
  let rootMoves = order(rootLegal, 0, 0).map(([m]) => [m, 0]);
  let bestMove = rootMoves[0][0];
  let bestScore = 0;
  let doneDepth = 0;
  for (let depth = 1; depth <= level.maxDepth; depth++) {
    try {
      let alpha = -INF;
      const scored = [];
      for (const [m] of rootMoves) {
        pos.make(m);
        history.push(pos.hash);
        const v = -negamax(depth - 1, -INF, -(alpha - level.noise), 1, true);
        history.pop();
        pos.unmake();
        scored.push([m, v]);
        if (v > alpha) alpha = v;
      }
      scored.sort((a, c) => c[1] - a[1]);
      rootMoves = scored;
      doneDepth = depth;
      bestScore = scored[0][1];
      if (level.noise) {
        const pick = scored
          .map(([m, v]) => [m, v + (Math.random() - 0.5) * level.noise])
          .sort((a, c) => c[1] - a[1]);
        bestMove = pick[0][0];
      } else bestMove = scored[0][0];
      if (Math.abs(bestScore) > MATE - 500) break; // 체크메이트 수순 발견
    } catch (e) {
      if (!(e instanceof Timeout)) throw e;
      break; // 시간 초과: 마지막으로 끝낸 깊이의 결과 사용 (탐색 중이던 pos 는 버림)
    }
  }
  return { uci: toUci(bestMove), depth: doneDepth, score: bestScore, nodes };
};
