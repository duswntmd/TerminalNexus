/**
 * 장기 AI: 알파-베타 네가맥스 + 반복 심화(시간 제한) + 잡는 수 정지 탐색
 * 탐색 중에는 의사 합법수를 쓰고 "궁을 잡는 수"를 최고점으로 처리한다 (루트에서만 엄밀한 합법수 사용)
 */
import {
  CHO, HAN, KING, GUARD, ROOK, CANNON, KNIGHT, ELEPHANT, PAWN, PASS,
  typeOf, teamOf, enemyOf, pseudoMoves, allLegalMoves, applyToBoard,
} from './engine.js';

const VALUE = { [KING]: 0, [ROOK]: 1300, [CANNON]: 700, [KNIGHT]: 500, [ELEPHANT]: 300, [GUARD]: 300, [PAWN]: 200 };
const MATE = 100000;

export const LEVELS = {
  easy: { label: '쉬움', timeMs: 250, maxDepth: 2, noise: 120 },
  normal: { label: '보통', timeMs: 1200, maxDepth: 4, noise: 15 },
  hard: { label: '어려움', timeMs: 3000, maxDepth: 6, noise: 0 },
};

/** 위치 점수 (초 시점 기준, 한은 위아래 뒤집어 적용) */
const positional = (type, x, y) => {
  const center = 4 - Math.abs(x - 4);
  switch (type) {
    case PAWN: {
      const adv = 6 - y; // 앞으로 나간 칸 수
      let v = adv > 0 ? adv * 12 : 0;
      if (y <= 2 && x >= 3 && x <= 5) v += 30; // 상대 궁성 침투
      if (y === 0) v -= 25; // 끝줄은 활용도 낮음
      return v + center * 3;
    }
    case KNIGHT: return center * 8 + (y < 9 ? 10 : 0);
    case ELEPHANT: return center * 4 + (y < 9 ? 6 : 0);
    case CANNON: return center * 3 + (y <= 6 ? 8 : 0);
    case ROOK: return (y < 9 ? 10 : 0) + center * 2;
    default: return 0;
  }
};

/** 평가 점수: 둘 차례(team) 기준 */
const evaluate = (b, team) => {
  let score = 0;
  for (let i = 0; i < 90; i++) {
    const p = b[i];
    if (!p) continue;
    const t = typeOf(p);
    const x = i % 9;
    const y = (i - x) / 9;
    const v = VALUE[t] + positional(t, x, teamOf(p) === CHO ? y : 9 - y);
    score += teamOf(p) === CHO ? v : -v;
  }
  // 궁 주변 사 보호
  for (const tm of [CHO, HAN]) {
    const k = b.indexOf(KING | tm);
    if (k < 0) continue;
    let guards = 0;
    for (let i = 0; i < 90; i++) if (b[i] === (GUARD | tm)) guards++;
    score += (tm === CHO ? 1 : -1) * guards * 25;
  }
  return team === CHO ? score : -score;
};

/** 수 생성 + 정렬 (잡는 수 우선: 비싼 기물을 싼 기물로) */
const genMoves = (b, team, capturesOnly = false) => {
  const moves = [];
  for (let i = 0; i < 90; i++) {
    const p = b[i];
    if (!p || teamOf(p) !== team) continue;
    for (const to of pseudoMoves(b, i)) {
      const cap = b[to];
      if (capturesOnly && !cap) continue;
      const order = cap ? (typeOf(cap) === KING ? 1e6 : VALUE[typeOf(cap)] * 10 - VALUE[typeOf(p)]) : 0;
      moves.push([i, to, order]);
    }
  }
  moves.sort((a, c) => c[2] - a[2]);
  return moves;
};

class Timeout extends Error {}

export const search = (board, team, levelKey = 'normal') => {
  const level = LEVELS[levelKey] || LEVELS.normal;
  const legal = allLegalMoves(board, team);
  if (legal.length === 0) return { from: PASS, to: PASS };

  const deadline = Date.now() + level.timeMs;
  let nodes = 0;
  const checkTime = () => {
    if ((++nodes & 1023) === 0 && Date.now() > deadline) throw new Timeout();
  };

  const quiesce = (b, tm, alpha, beta, qd) => {
    checkTime();
    const stand = evaluate(b, tm);
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    if (qd <= 0) return alpha;
    for (const [f, t] of genMoves(b, tm, true)) {
      if (typeOf(b[t]) === KING) return MATE;
      const v = -quiesce(applyToBoard(b, f, t), enemyOf(tm), -beta, -alpha, qd - 1);
      if (v >= beta) return beta;
      if (v > alpha) alpha = v;
    }
    return alpha;
  };

  const negamax = (b, tm, depth, alpha, beta, ply) => {
    checkTime();
    if (depth <= 0) return quiesce(b, tm, alpha, beta, 4);
    const moves = genMoves(b, tm);
    let best = -MATE - 1;
    for (const [f, t] of moves) {
      if (typeOf(b[t]) === KING) return MATE - ply; // 궁을 잡을 수 있음
      const v = -negamax(applyToBoard(b, f, t), enemyOf(tm), depth - 1, -beta, -alpha, ply + 1);
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  };

  // 루트: 엄밀한 합법수, 잡는 수 우선 정렬
  let rootMoves = legal
    .map(([f, t]) => [f, t, board[t] ? VALUE[typeOf(board[t])] * 10 - VALUE[typeOf(board[f])] : 0])
    .sort((a, c) => c[2] - a[2]);
  let bestMove = rootMoves[0];

  for (let depth = 1; depth <= level.maxDepth; depth++) {
    try {
      let alpha = -MATE - 1;
      const scored = [];
      for (const [f, t] of rootMoves) {
        const noise = level.noise ? (Math.random() - 0.5) * level.noise : 0;
        const v = -negamax(applyToBoard(board, f, t), enemyOf(team), depth - 1, -MATE - 1, -alpha + level.noise, 1) + noise;
        scored.push([f, t, v]);
        if (v > alpha) alpha = v;
      }
      scored.sort((a, c) => c[2] - a[2]);
      rootMoves = scored;
      bestMove = scored[0];
      if (scored[0][2] >= MATE - 100) break; // 외통 발견
    } catch (e) {
      if (!(e instanceof Timeout)) throw e;
      break; // 시간 초과: 직전 깊이 결과 사용
    }
  }
  return { from: bestMove[0], to: bestMove[1], nodes };
};

