/**
 * 오목 규칙 엔진 (RULES.md 가 기준 문서, 서버 OmokRules.java 와 같은 판정)
 *
 * 판: 15x15, 칸 번호 idx = y * 15 + x (x: 왼쪽→오른쪽 A~O, y: 위→아래. 화면 좌표의 15행이 y=0)
 * 규칙(rule)
 *  - renju    : 흑만 3-3·4-4·장목 금수. 흑은 정확히 5목, 백은 5목 이상이면 승리
 *  - standard : 흑백 모두 3-3 금수. 4-4 허용. 장목은 둘 수 있지만 승리가 아님(정확히 5목만 승리)
 *  - free     : 금수 없음. 5목 이상이면 승리
 */
export const SIZE = 15;
export const CELLS = SIZE * SIZE;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;
export const RULES = ['renju', 'standard', 'free'];

const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

export const enemyOf = (c) => 3 - c;
export const toIdx = (x, y) => y * SIZE + x;
export const xOf = (idx) => idx % SIZE;
export const yOf = (idx) => (idx - (idx % SIZE)) / SIZE;
/** 좌표 표기: 열 A~O, 행은 아래에서부터 1~15 (H8 = 천원) */
export const coordOf = (idx) => `${String.fromCharCode(65 + xOf(idx))}${SIZE - yOf(idx)}`;

/** 정확히 5목이어야 이기는 쪽인가 (장목이 승리가 아닌 쪽) */
export const needsExactFive = (rule, color) => rule === 'standard' || (rule === 'renju' && color === BLACK);
/** 금수가 적용되는 쪽인가 */
export const isRestricted = (rule, color) => rule === 'standard' || (rule === 'renju' && color === BLACK);

const inside = (x, y) => x >= 0 && y >= 0 && x < SIZE && y < SIZE;
const at = (board, x, y) => (inside(x, y) ? board[y * SIZE + x] : -1);

/** (x,y)를 지나는 d 방향의 같은 색 연속 길이. back/fwd 는 양쪽으로 이어진 개수 */
const run = (board, x, y, d, color) => {
  const [dx, dy] = DIRS[d];
  let back = 0;
  let fwd = 0;
  while (at(board, x - (back + 1) * dx, y - (back + 1) * dy) === color) back += 1;
  while (at(board, x + (fwd + 1) * dx, y + (fwd + 1) * dy) === color) fwd += 1;
  return { back, fwd, len: back + fwd + 1 };
};

const winningLen = (len, exact) => (exact ? len === 5 : len >= 5);

/**
 * idx 에 놓인 color 돌로 승리가 되었으면 그 줄의 칸 목록, 아니면 null
 */
export const winLineAt = (board, idx, color, rule) => {
  const x = xOf(idx);
  const y = yOf(idx);
  const exact = needsExactFive(rule, color);
  for (let d = 0; d < 4; d += 1) {
    const r = run(board, x, y, d, color);
    if (winningLen(r.len, exact)) {
      const [dx, dy] = DIRS[d];
      const line = [];
      for (let k = -r.back; k <= r.fwd; k += 1) line.push(toIdx(x + k * dx, y + k * dy));
      return line;
    }
  }
  return null;
};

/**
 * (x,y)의 돌을 포함해 5목을 완성하는 빈칸들의 거리(k) 목록 — d 방향, 최대 2개(앞·뒤 한 칸씩)
 * 5목에 (x,y)가 들어가려면 그 빈칸은 (x,y)의 연속 줄 바로 옆이어야 한다.
 */
const fivePoints = (board, x, y, d, color, exact) => {
  const [dx, dy] = DIRS[d];
  const r = run(board, x, y, d, color);
  const pts = [];
  for (const k of [-(r.back + 1), r.fwd + 1]) {
    const qx = x + k * dx;
    const qy = y + k * dy;
    if (at(board, qx, qy) !== EMPTY) continue;
    board[qy * SIZE + qx] = color;
    const len = run(board, qx, qy, d, color).len;
    board[qy * SIZE + qx] = EMPTY;
    if (winningLen(len, exact)) pts.push(k);
  }
  return pts;
};

/** 5목 완성점이 2개이고 그 사이가 연속 4개 → 열린 4(straight four) */
const isStraight = (pts) => pts.length === 2 && pts[1] - pts[0] === 5;
/** 한 줄 위의 4 개수: 열린 4는 1개, 완성점이 떨어져 2개면(예: ●·●●●·●) 한 줄 4-4 */
const fourCount = (pts) => (isStraight(pts) ? 1 : pts.length);

/**
 * (x,y)의 돌이 d 방향으로 3(한 수 더 두어 열린 4를 만들 수 있는 줄)을 이루는가.
 * 열린 4를 만드는 자리가 그 자체로 금수이면 3으로 치지 않는다 (RIF 9.3, 거짓 금수).
 */
const isThree = (board, x, y, d, color, rule) => {
  const [dx, dy] = DIRS[d];
  const exact = needsExactFive(rule, color);
  const r0 = run(board, x, y, d, color);
  // 열린 4는 (x,y)를 포함해 4개가 붙어 있어야 하므로, 더 둘 자리는 양쪽의 "첫 빈칸" 둘뿐이다
  for (const k of [-(r0.back + 1), r0.fwd + 1]) {
    const qx = x + k * dx;
    const qy = y + k * dy;
    if (at(board, qx, qy) !== EMPTY) continue;
    const qi = qy * SIZE + qx;
    board[qi] = color;
    const straight = run(board, qx, qy, d, color).len === 4
      && isStraight(fivePoints(board, qx, qy, d, color, exact));
    board[qi] = EMPTY;
    if (straight && forbiddenReason(board, qi, color, rule) === null) return true;
  }
  return false;
};

/**
 * 빈칸 idx 에 color 가 두는 것이 금수인지. 금수면 'three3' | 'four4' | 'overline', 아니면 null.
 * 5목(승리)이 되는 수는 금수 모양이 함께 생겨도 금수가 아니다.
 */
export function forbiddenReason(board, idx, color, rule) {
  if (!isRestricted(rule, color) || board[idx] !== EMPTY) return null;
  const x = xOf(idx);
  const y = yOf(idx);
  const exact = needsExactFive(rule, color);
  board[idx] = color;
  try {
    const lens = [0, 1, 2, 3].map((d) => run(board, x, y, d, color).len);
    if (lens.some((len) => winningLen(len, exact))) return null;
    const renju = rule === 'renju';
    if (renju && lens.some((len) => len >= 6)) return 'overline';
    let fours = 0;
    let threes = 0;
    for (let d = 0; d < 4; d += 1) {
      if (lens[d] >= 5) continue; // 일반룰의 장목 줄: 3도 4도 아님
      const f = fourCount(fivePoints(board, x, y, d, color, exact));
      if (f > 0) fours += f;
      else if (isThree(board, x, y, d, color, rule)) threes += 1;
    }
    if (renju && fours >= 2) return 'four4';
    if (threes >= 2) return 'three3';
    return null;
  } finally {
    board[idx] = EMPTY;
  }
}

/** 지금 color 가 둘 수 없는 금수 자리 전체 { idx: reason } (판 위 표시용) */
export const forbiddenPoints = (board, color, rule) => {
  const out = {};
  if (!isRestricted(rule, color)) return out;
  for (let idx = 0; idx < CELLS; idx += 1) {
    if (board[idx] !== EMPTY) continue;
    // 주변(줄 방향 2칸 안)에 같은 색 돌이 2개 이상 있어야 금수 모양이 생길 수 있다
    const x = xOf(idx);
    const y = yOf(idx);
    let near = 0;
    for (let d = 0; d < 4 && near < 2; d += 1) {
      for (let k = -3; k <= 3; k += 1) {
        if (k !== 0 && at(board, x + k * DIRS[d][0], y + k * DIRS[d][1]) === color) near += 1;
      }
    }
    if (near < 2) continue;
    const reason = forbiddenReason(board, idx, color, rule);
    if (reason) out[idx] = reason;
  }
  return out;
};

/* ── 대국 상태 ── */

export const newGame = (rule = 'renju') => ({
  rule: RULES.includes(rule) ? rule : 'renju',
  board: new Int8Array(CELLS),
  moves: [],
  turn: BLACK,
  status: 'PLAYING',
  winner: null,
  reason: null,
  winLine: null,
});

/** 둘 수 없는 이유('occupied' | 'three3' | 'four4' | 'overline' | 'finished') 또는 null */
export const moveError = (game, idx) => {
  if (game.status !== 'PLAYING') return 'finished';
  if (!Number.isInteger(idx) || idx < 0 || idx >= CELLS || game.board[idx] !== EMPTY) return 'occupied';
  return forbiddenReason(game.board, idx, game.turn, game.rule);
};

const hasLegalMove = (board, color, rule) => {
  for (let idx = 0; idx < CELLS; idx += 1) {
    if (board[idx] === EMPTY && forbiddenReason(board, idx, color, rule) === null) return true;
  }
  return false;
};

/** 착수. 둘 수 없는 수면 null */
export const playMove = (game, idx) => {
  if (moveError(game, idx) !== null) return null;
  const board = Int8Array.from(game.board);
  const color = game.turn;
  board[idx] = color;
  const moves = [...game.moves, idx];
  const next = { ...game, board, moves, turn: enemyOf(color) };
  const line = winLineAt(board, idx, color, game.rule);
  if (line) return { ...next, status: 'FINISHED', winner: color, reason: 'five', winLine: line };
  // 판이 다 찼거나, 남은 자리가 모두 금수여서 둘 곳이 없으면 무승부
  if (moves.length >= CELLS || (moves.length >= CELLS - 30 && !hasLegalMove(board, next.turn, game.rule))) {
    return { ...next, status: 'FINISHED', winner: null, reason: 'full' };
  }
  return next;
};

/** 기권·시간패·퇴장 등 판 밖의 사유로 끝냄 */
export const finishWith = (game, winner, reason, winLine = null) => ({
  ...game, status: 'FINISHED', winner, reason, winLine: winLine || game.winLine,
});

/** 수순으로 대국을 재구성 (온라인: 서버가 보낸 기보, 복기: n수까지) */
export const replay = (rule, moves, upto = moves.length) => {
  let g = newGame(rule);
  for (let i = 0; i < upto; i += 1) {
    const next = playMove(g, moves[i]);
    if (!next) break;
    g = next;
  }
  return g;
};

/** n수까지의 판만 필요할 때 (복기 화면) */
export const boardAt = (moves, upto) => {
  const board = new Int8Array(CELLS);
  for (let i = 0; i < upto && i < moves.length; i += 1) board[moves[i]] = i % 2 === 0 ? BLACK : WHITE;
  return board;
};
