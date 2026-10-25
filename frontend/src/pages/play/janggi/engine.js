/**
 * 장기 규칙 엔진 (UI · AI 워커 공용, 서버 JanggiEngine.java 와 동일한 규칙)
 *
 * 판 표현: 길이 90 배열, idx = y * 9 + x  (x: 0~8 세로줄, y: 0~9 가로줄)
 *  - 위쪽(y 0~3)이 한(漢), 아래쪽(y 6~9)이 초(楚)
 *  - 칸 값: 0 = 빈칸, 기물 = 종류(1~7) | 진영(초 0, 한 8)
 */

export const CHO = 0;
export const HAN = 8;

export const KING = 1;     // 궁
export const GUARD = 2;    // 사
export const ROOK = 3;     // 차
export const CANNON = 4;   // 포
export const KNIGHT = 5;   // 마
export const ELEPHANT = 6; // 상
export const PAWN = 7;     // 졸/병

export const PASS = -1;
export const MAX_PLIES = 200; // 이 수를 넘기면 점수 판정

export const typeOf = (p) => p & 7;
export const teamOf = (p) => p & 8;
export const enemyOf = (team) => (team === CHO ? HAN : CHO);
export const teamName = (team) => (team === CHO ? 'CHO' : 'HAN');
export const teamFromName = (name) => (name === 'HAN' ? HAN : CHO);

const idx = (x, y) => y * 9 + x;
const onBoard = (x, y) => x >= 0 && x <= 8 && y >= 0 && y <= 9;

// 기물 점수 (초 72점, 한은 덤 1.5점 추가)
export const PIECE_SCORE = { [KING]: 0, [ROOK]: 13, [CANNON]: 7, [KNIGHT]: 5, [ELEPHANT]: 3, [GUARD]: 3, [PAWN]: 2 };
export const HAN_BONUS = 1.5;

// 상차림: 왼쪽 차 옆부터 [b1, b2, (사-궁-사), b3, b4] (각 진영 자신의 시점 기준)
export const FORMATIONS = {
  N_E_N_E: { name: '마상마상', desc: '원앙마', pieces: [KNIGHT, ELEPHANT, KNIGHT, ELEPHANT] },
  E_N_E_N: { name: '상마상마', desc: '귀마', pieces: [ELEPHANT, KNIGHT, ELEPHANT, KNIGHT] },
  N_E_E_N: { name: '마상상마', desc: '양귀마', pieces: [KNIGHT, ELEPHANT, ELEPHANT, KNIGHT] },
  E_N_N_E: { name: '상마마상', desc: '양귀상', pieces: [ELEPHANT, KNIGHT, KNIGHT, ELEPHANT] },
};
export const DEFAULT_FORMATION = 'N_E_N_E';

/** 초기 판 생성 */
export const createBoard = (choFormation = DEFAULT_FORMATION, hanFormation = DEFAULT_FORMATION) => {
  const b = new Array(90).fill(0);
  const place = (team, backY, kingY, cannonY, pawnY, formation) => {
    const f = (FORMATIONS[formation] || FORMATIONS[DEFAULT_FORMATION]).pieces;
    // 한은 화면 위쪽에서 아래를 보므로 자기 기준 왼쪽 = x 8
    const col = (x) => (team === CHO ? x : 8 - x);
    b[idx(col(0), backY)] = ROOK | team;
    b[idx(col(1), backY)] = f[0] | team;
    b[idx(col(2), backY)] = f[1] | team;
    b[idx(3, backY)] = GUARD | team;
    b[idx(5, backY)] = GUARD | team;
    b[idx(col(6), backY)] = f[2] | team;
    b[idx(col(7), backY)] = f[3] | team;
    b[idx(col(8), backY)] = ROOK | team;
    b[idx(4, kingY)] = KING | team;
    b[idx(1, cannonY)] = CANNON | team;
    b[idx(7, cannonY)] = CANNON | team;
    for (const x of [0, 2, 4, 6, 8]) b[idx(x, pawnY)] = PAWN | team;
  };
  place(HAN, 0, 1, 2, 3, hanFormation);
  place(CHO, 9, 8, 7, 6, choFormation);
  return b;
};

/* ── 궁성 ── */
const inPalace = (x, y) => x >= 3 && x <= 5 && ((y >= 0 && y <= 2) || (y >= 7 && y <= 9));
const samePalaceHalf = (y1, y2) => (y1 <= 2) === (y2 <= 2);

// 궁성 대각선 (코너 ↔ 중앙)
const DIAG = {};
const DIAG_LINES = [
  [idx(3, 0), idx(4, 1), idx(5, 2)], [idx(5, 0), idx(4, 1), idx(3, 2)],
  [idx(3, 7), idx(4, 8), idx(5, 9)], [idx(5, 7), idx(4, 8), idx(3, 9)],
];
for (const [a, c, d] of DIAG_LINES) {
  (DIAG[a] ||= []).push(c);
  (DIAG[d] ||= []).push(c);
  (DIAG[c] ||= []).push(a, d);
}

const ORTH = [[0, 1], [0, -1], [1, 0], [-1, 0]];

/**
 * 의사 합법수 (자기 궁이 잡히는지는 검사하지 않음)
 * @returns {number[]} 도착 칸 인덱스 목록
 */
export const pseudoMoves = (b, from) => {
  const p = b[from];
  if (!p) return [];
  const team = teamOf(p);
  const x = from % 9;
  const y = (from - x) / 9;
  const out = [];
  const canLand = (t) => !b[t] || teamOf(b[t]) !== team;

  switch (typeOf(p)) {
    case KING:
    case GUARD: {
      for (const [dx, dy] of ORTH) {
        const nx = x + dx, ny = y + dy;
        if (inPalace(nx, ny) && samePalaceHalf(y, ny) && canLand(idx(nx, ny))) out.push(idx(nx, ny));
      }
      for (const t of DIAG[from] || []) if (canLand(t)) out.push(t);
      break;
    }
    case ROOK: {
      for (const [dx, dy] of ORTH) {
        for (let nx = x + dx, ny = y + dy; onBoard(nx, ny); nx += dx, ny += dy) {
          const t = idx(nx, ny);
          if (!b[t]) { out.push(t); continue; }
          if (teamOf(b[t]) !== team) out.push(t);
          break;
        }
      }
      // 궁성 대각선 따라 이동
      for (const line of DIAG_LINES) {
        const pos = line.indexOf(from);
        if (pos < 0) continue;
        for (const step of [-1, 1]) {
          for (let i = pos + step; i >= 0 && i < 3; i += step) {
            const t = line[i];
            if (!b[t]) { out.push(t); continue; }
            if (teamOf(b[t]) !== team) out.push(t);
            break;
          }
        }
      }
      break;
    }
    case CANNON: {
      for (const [dx, dy] of ORTH) {
        let screen = false;
        for (let nx = x + dx, ny = y + dy; onBoard(nx, ny); nx += dx, ny += dy) {
          const t = idx(nx, ny);
          const q = b[t];
          if (!screen) {
            if (q) {
              if (typeOf(q) === CANNON) break; // 포는 포를 넘지 못함
              screen = true;
            }
            continue;
          }
          if (!q) { out.push(t); continue; }
          if (teamOf(q) !== team && typeOf(q) !== CANNON) out.push(t); // 포는 포를 잡지 못함
          break;
        }
      }
      // 궁성 대각선: 코너에서 중앙을 넘어 반대 코너로
      for (const line of DIAG_LINES) {
        const pos = line.indexOf(from);
        if (pos !== 0 && pos !== 2) continue;
        const mid = b[line[1]];
        const t = line[2 - pos];
        if (mid && typeOf(mid) !== CANNON && (!b[t] || (teamOf(b[t]) !== team && typeOf(b[t]) !== CANNON))) out.push(t);
      }
      break;
    }
    case KNIGHT: {
      for (const [dx, dy] of ORTH) {
        const lx = x + dx, ly = y + dy;
        if (!onBoard(lx, ly) || b[idx(lx, ly)]) continue; // 멱
        for (const s of [-1, 1]) {
          const nx = lx + dx + (dx === 0 ? s : 0);
          const ny = ly + dy + (dy === 0 ? s : 0);
          if (onBoard(nx, ny) && canLand(idx(nx, ny))) out.push(idx(nx, ny));
        }
      }
      break;
    }
    case ELEPHANT: {
      for (const [dx, dy] of ORTH) {
        const ax = x + dx, ay = y + dy;
        if (!onBoard(ax, ay) || b[idx(ax, ay)]) continue; // 첫 번째 멱
        for (const s of [-1, 1]) {
          const ddx = dx === 0 ? s : dx;
          const ddy = dy === 0 ? s : dy;
          const bx = ax + ddx, by = ay + ddy;
          if (!onBoard(bx, by) || b[idx(bx, by)]) continue; // 두 번째 멱
          const nx = bx + ddx, ny = by + ddy;
          if (onBoard(nx, ny) && canLand(idx(nx, ny))) out.push(idx(nx, ny));
        }
      }
      break;
    }
    case PAWN: {
      const f = team === CHO ? -1 : 1;
      for (const [dx, dy] of [[0, f], [-1, 0], [1, 0]]) {
        const nx = x + dx, ny = y + dy;
        if (onBoard(nx, ny) && canLand(idx(nx, ny))) out.push(idx(nx, ny));
      }
      // 상대 궁성 안에서는 앞쪽 대각선으로도 이동
      for (const t of DIAG[from] || []) {
        const ty = Math.floor(t / 9);
        if (ty === y + f && canLand(t)) out.push(t);
      }
      break;
    }
    default:
      break;
  }
  return out;
};

export const findKing = (b, team) => b.indexOf(KING | team);

/** sq 칸을 byTeam 진영이 공격하고 있는지 */
export const isAttacked = (b, sq, byTeam) => {
  for (let i = 0; i < 90; i++) {
    const p = b[i];
    if (p && teamOf(p) === byTeam && pseudoMoves(b, i).includes(sq)) return true;
  }
  return false;
};

export const inCheck = (b, team) => {
  const k = findKing(b, team);
  return k >= 0 && isAttacked(b, k, enemyOf(team));
};

/** 판에 수를 적용한 새 판 (원본 불변) */
export const applyToBoard = (b, from, to) => {
  if (from === PASS) return b;
  const nb = b.slice();
  nb[to] = nb[from];
  nb[from] = 0;
  return nb;
};

/** 합법수: 두고 나서 자기 궁이 장군 상태가 아닌 수 */
export const legalMovesFrom = (b, from) => {
  const p = b[from];
  if (!p) return [];
  const team = teamOf(p);
  return pseudoMoves(b, from).filter((to) => !inCheck(applyToBoard(b, from, to), team));
};

export const allLegalMoves = (b, team) => {
  const moves = [];
  for (let i = 0; i < 90; i++) {
    const p = b[i];
    if (p && teamOf(p) === team) for (const to of legalMovesFrom(b, i)) moves.push([i, to]);
  }
  return moves;
};

/** 빅장: 두 궁이 같은 세로줄에서 사이에 아무 기물 없이 마주봄 */
export const kingsFacing = (b) => {
  const c = findKing(b, CHO);
  const h = findKing(b, HAN);
  if (c < 0 || h < 0 || c % 9 !== h % 9) return false;
  for (let i = Math.min(c, h) + 9; i < Math.max(c, h); i += 9) if (b[i]) return false;
  return true;
};

export const scores = (b) => {
  let cho = 0;
  let han = HAN_BONUS;
  for (const p of b) {
    if (!p) continue;
    if (teamOf(p) === CHO) cho += PIECE_SCORE[typeOf(p)];
    else han += PIECE_SCORE[typeOf(p)];
  }
  return { cho, han };
};

/* ── 대국 진행 상태 ── */

/**
 * 새 대국 상태
 * status: 'PLAYING' | 'FINISHED',  winner: 'CHO' | 'HAN' | null,  reason: 종료 사유
 */
export const newGame = (choFormation = DEFAULT_FORMATION, hanFormation = DEFAULT_FORMATION) => ({
  board: createBoard(choFormation, hanFormation),
  turn: CHO,
  moves: [], // [from, to, captured] (한수쉼은 [PASS, PASS, 0])
  status: 'PLAYING',
  winner: null,
  reason: null,
  bikjang: false, // 직전 수로 빅장이 걸렸는지
  choFormation,
  hanFormation,
});

const scoreWinner = (b) => {
  const s = scores(b);
  return s.cho > s.han ? 'CHO' : 'HAN'; // 덤 1.5 때문에 동점 없음
};

/**
 * 수를 두고 다음 상태를 반환 (합법성은 호출 전에 확인)
 * from === PASS 이면 한수쉼
 */
export const playMove = (state, from, to) => {
  if (state.status !== 'PLAYING') return state;
  const mover = state.turn;
  const opp = enemyOf(mover);
  const captured = from === PASS ? 0 : state.board[to];
  const board = applyToBoard(state.board, from, to);
  const moves = [...state.moves, [from, to, captured]];
  const next = { ...state, board, moves, turn: opp, bikjang: false };

  const finish = (winner, reason) => ({ ...next, status: 'FINISHED', winner, reason });

  // 연속 한수쉼 → 점수 판정
  const prev = state.moves[state.moves.length - 1];
  if (from === PASS && prev && prev[0] === PASS) return finish(scoreWinner(board), '양측 한수쉼 · 점수 판정');

  const facing = kingsFacing(board);
  if (facing && state.bikjang) return finish(scoreWinner(board), '빅장 · 점수 판정');
  if (facing) next.bikjang = true;

  // 외통: 상대가 장군인데 피할 수가 없음
  if (inCheck(board, opp) && allLegalMoves(board, opp).length === 0) {
    return finish(teamName(mover), '외통 승');
  }

  if (moves.length >= MAX_PLIES) return finish(scoreWinner(board), `${MAX_PLIES}수 도달 · 점수 판정`);
  return next;
};

export const resign = (state, team) => (
  state.status !== 'PLAYING' ? state : { ...state, status: 'FINISHED', winner: teamName(enemyOf(team)), reason: '기권승' }
);

/** 기보 목록으로 상태 재구성 (온라인 대국 동기화용) */
export const replay = (choFormation, hanFormation, moveList) => {
  let s = newGame(choFormation, hanFormation);
  for (const [from, to] of moveList) s = playMove(s, from, to);
  return s;
};

/* ── 표시용 ── */
export const PIECE_CHAR = {
  [CHO]: { [KING]: '楚', [GUARD]: '士', [ROOK]: '車', [CANNON]: '包', [KNIGHT]: '馬', [ELEPHANT]: '象', [PAWN]: '卒' },
  [HAN]: { [KING]: '漢', [GUARD]: '士', [ROOK]: '車', [CANNON]: '包', [KNIGHT]: '馬', [ELEPHANT]: '象', [PAWN]: '兵' },
};
export const PIECE_NAME = { [KING]: '궁', [GUARD]: '사', [ROOK]: '차', [CANNON]: '포', [KNIGHT]: '마', [ELEPHANT]: '상', [PAWN]: '졸' };

/** 기보 표기: 초 차 1·9 → 1·5 (세로줄 1~9, 가로줄 0~9) */
export const notation = (move, mover, boardBefore) => {
  const [from, to, captured] = move;
  const side = mover === CHO ? '초' : '한';
  if (from === PASS) return `${side} 한수쉼`;
  const p = boardBefore[from];
  const sq = (i) => `${(i % 9) + 1}·${Math.floor(i / 9)}`;
  const name = typeOf(p) === PAWN && mover === HAN ? '병' : PIECE_NAME[typeOf(p)];
  const cap = captured ? ` (${PIECE_NAME[typeOf(captured)]} 잡음)` : '';
  return `${side} ${name} ${sq(from)} → ${sq(to)}${cap}`;
};
