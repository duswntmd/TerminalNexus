/* 리버시 규칙 엔진 (화면과 분리된 순수 함수). 규칙은 RULES.md.
 * 판: 8×8 = 64칸, 0 빈칸 / 1 흑 / 2 백. idx = y * 8 + x, 좌표 이름은 a1(왼쪽 위) ~ h8.
 */
export const N = 8;
export const CELLS = 64;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;
export const PASS = -1;

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

export const xOf = (i) => i % N;
export const yOf = (i) => (i - (i % N)) / N;
export const coordOf = (i) => (i === PASS ? 'pass' : `${'abcdefgh'[xOf(i)]}${yOf(i) + 1}`);

/** color 가 idx 에 두면 뒤집히는 돌 목록 (둘 수 없으면 빈 배열) */
export const flipsFor = (board, idx, color) => {
  if (board[idx] !== EMPTY) return [];
  const op = 3 - color;
  const x0 = xOf(idx);
  const y0 = yOf(idx);
  const out = [];
  for (const [dx, dy] of DIRS) {
    let x = x0 + dx;
    let y = y0 + dy;
    const line = [];
    while (x >= 0 && y >= 0 && x < N && y < N && board[y * N + x] === op) {
      line.push(y * N + x);
      x += dx;
      y += dy;
    }
    if (line.length && x >= 0 && y >= 0 && x < N && y < N && board[y * N + x] === color) out.push(...line);
  }
  return out;
};

export const legalMoves = (board, color) => {
  const out = [];
  for (let i = 0; i < CELLS; i += 1) if (board[i] === EMPTY && flipsFor(board, i, color).length) out.push(i);
  return out;
};

export const countOf = (board) => {
  let b = 0;
  let w = 0;
  for (let i = 0; i < CELLS; i += 1) {
    if (board[i] === BLACK) b += 1;
    else if (board[i] === WHITE) w += 1;
  }
  return { [BLACK]: b, [WHITE]: w };
};

export const initialBoard = () => {
  const b = new Int8Array(CELLS);
  b[27] = WHITE; // d4
  b[28] = BLACK; // e4
  b[35] = BLACK; // d5
  b[36] = WHITE; // e5
  return b;
};

/**
 * 대국 상태. moves 에는 둔 자리와 패스(-1)가 순서대로 들어간다.
 * status: PLAYING | FINISHED, winner: BLACK | WHITE | null(무승부)
 */
export const newGame = () => ({
  board: initialBoard(),
  turn: BLACK,
  moves: [],
  last: null,
  flipped: [],
  status: 'PLAYING',
  winner: null,
});

const finish = (g) => {
  const c = countOf(g.board);
  return { ...g, status: 'FINISHED', winner: c[BLACK] === c[WHITE] ? null : c[BLACK] > c[WHITE] ? BLACK : WHITE };
};

/**
 * 착수. 둘 수 없는 자리면 null.
 * 다음 사람이 둘 곳이 없으면 자동으로 패스(moves 에 -1)하고, 둘 다 둘 곳이 없으면 끝낸다.
 */
export const playMove = (game, idx) => {
  if (game.status !== 'PLAYING') return null;
  const flips = flipsFor(game.board, idx, game.turn);
  if (!flips.length) return null;
  const board = Int8Array.from(game.board);
  board[idx] = game.turn;
  for (const f of flips) board[f] = game.turn;
  const moves = [...game.moves, idx];
  let next = { ...game, board, moves, last: idx, flipped: flips, turn: 3 - game.turn };
  if (legalMoves(board, next.turn).length) return next;
  if (legalMoves(board, game.turn).length) return { ...next, turn: game.turn, moves: [...moves, PASS] };
  next = finish(next);
  return next;
};

/** 수순(패스 포함)으로 대국을 다시 만든다 (무르기·복기) */
export const replay = (moves, upto = moves.length) => {
  let g = newGame();
  for (let i = 0; i < upto && i < moves.length; i += 1) {
    if (moves[i] === PASS) continue; // 패스는 playMove 가 알아서 넣는다
    const next = playMove(g, moves[i]);
    if (!next) break;
    g = next;
  }
  return g;
};

/** 기권 등 판 밖의 사유로 끝냄 */
export const resignGame = (game, loser) => ({ ...game, status: 'FINISHED', winner: 3 - loser, resigned: loser });
