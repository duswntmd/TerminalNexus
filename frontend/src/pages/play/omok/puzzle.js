/* 오목 묘수풀이: 연속 4(VCF)로 이기는 수순 풀이기.
 * 공격하는 쪽은 매 수 4(다음 수에 5목)를 만들고, 막는 쪽은 그 5목 자리를 막을 수밖에 없다.
 * 문제 만들기(scripts/omok-puzzles-gen.mjs), 화면의 정답 확인, 시험(scripts/omok-test.mjs)이 함께 쓴다.
 */
import { SIZE, CELLS, EMPTY, BLACK, WHITE, xOf, yOf, winLineAt, forbiddenReason } from './engine.js';

/** 돌 주변(2칸 안) 빈칸만 후보로 본다 — 4·5목은 기존 돌 옆에서만 생긴다 */
const nearEmpties = (board) => {
  const out = [];
  for (let i = 0; i < CELLS; i += 1) {
    if (board[i] !== EMPTY) continue;
    const x = xOf(i);
    const y = yOf(i);
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy += 1) {
      for (let dx = -2; dx <= 2; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < SIZE && ny < SIZE && board[ny * SIZE + nx] !== EMPTY) { near = true; break; }
      }
    }
    if (near) out.push(i);
  }
  return out;
};

const winsAt = (board, idx, color, rule) => {
  if (board[idx] !== EMPTY) return false;
  board[idx] = color;
  const ok = winLineAt(board, idx, color, rule) != null;
  board[idx] = EMPTY;
  return ok;
};

/** color 가 지금 두면 5목이 되는 빈칸 목록 */
export const fivePoints = (board, color, rule, cand = nearEmpties(board)) => cand.filter((i) => winsAt(board, i, color, rule));

/**
 * 공격 쪽이 move 를 두었을 때 막는 쪽의 응수.
 * @returns {{ type: 'five' } | { type: 'win' } | { type: 'block', reply } | { type: 'none' } | { type: 'illegal' } | { type: 'lose' }}
 *   five: 바로 5목 / win: 막을 수 없는 4(4-4·열린 4·막을 자리가 금수) / block: reply 로 막아야 함
 *   none: 4가 아님 / illegal: 둘 수 없는 자리 / lose: 둔 뒤 상대가 바로 5목
 */
export const attackStep = (board, attacker, rule, move) => {
  const defender = 3 - attacker;
  if (move < 0 || move >= CELLS || board[move] !== EMPTY || forbiddenReason(board, move, attacker, rule)) return { type: 'illegal' };
  board[move] = attacker;
  try {
    if (winLineAt(board, move, attacker, rule)) return { type: 'five' };
    const cand = nearEmpties(board);
    if (fivePoints(board, defender, rule, cand).length) return { type: 'lose' };
    const threats = fivePoints(board, attacker, rule, cand);
    if (!threats.length) return { type: 'none' };
    if (threats.length >= 2) return { type: 'win' };
    const reply = threats[0];
    if (forbiddenReason(board, reply, defender, rule)) return { type: 'win' }; // 흑(렌주룰)이 금수라 막지 못함
    return { type: 'block', reply };
  } finally {
    board[move] = EMPTY;
  }
};

/**
 * 공격 쪽이 left 수 안에 연속 4로 이기는 첫 수들. 5목을 두는 수까지 센다 (left = 1 이면 바로 5목).
 * board 는 잠시 바꿨다가 되돌린다.
 */
const winsWithin = (board, attacker, rule, left, firstOnly) => {
  const defender = 3 - attacker;
  const cand = nearEmpties(board);
  const myFive = fivePoints(board, attacker, rule, cand);
  if (myFive.length) return myFive;
  if (left <= 1) return [];
  // 상대가 5목 자리를 가지고 있으면 그 자리를 막는 수만 가능
  const opFive = fivePoints(board, defender, rule, cand);
  if (opFive.length > 1) return [];
  const moves = opFive.length ? opFive : cand;
  const out = [];
  for (const m of moves) {
    const step = attackStep(board, attacker, rule, m);
    if (step.type === 'five' || step.type === 'win') {
      if (step.type === 'win' && left < 2) continue;
      out.push(m);
    } else if (step.type === 'block') {
      if (left < 3) continue;
      board[m] = attacker;
      board[step.reply] = defender;
      const defWins = winLineAt(board, step.reply, defender, rule) != null;
      const ok = !defWins && winsWithin(board, attacker, rule, left - 1, true).length > 0;
      board[step.reply] = EMPTY;
      board[m] = EMPTY;
      if (ok) out.push(m);
    }
    if (out.length && firstOnly) return out;
  }
  return out;
};

/** 연속 4로 이기는 가장 짧은 수 (공격 쪽 수 기준, max 까지), 없으면 0 */
export const vcfLength = (board, attacker, rule, max = 6) => {
  const b = Int8Array.from(board);
  for (let n = 1; n <= max; n += 1) {
    if (winsWithin(b, attacker, rule, n, true).length) return n;
  }
  return 0;
};

/** left 수 안에 이기는 첫 수 전부 (정답 개수 확인용) */
export const winningFirstMoves = (board, attacker, rule, left) => winsWithin(Int8Array.from(board), attacker, rule, left, false);

/** 수 하나가 정답 수순 안에 드는가: 두고 나서 (막은 뒤) left-1 수 안에 이길 수 있으면 정답 */
export const isGoodMove = (board, attacker, rule, move, left) => {
  const b = Int8Array.from(board);
  const step = attackStep(b, attacker, rule, move);
  if (step.type === 'five') return { ok: true, step };
  if (step.type === 'win') return { ok: left >= 2, step };
  if (step.type !== 'block' || left < 3) return { ok: false, step };
  b[move] = attacker;
  b[step.reply] = 3 - attacker;
  if (winLineAt(b, step.reply, 3 - attacker, rule)) return { ok: false, step };
  return { ok: winsWithin(b, attacker, rule, left - 1, true).length > 0, step };
};

/** 수순 → 판 */
export const boardOf = (moves) => {
  const board = new Int8Array(CELLS);
  moves.forEach((m, i) => { board[m] = i % 2 === 0 ? BLACK : WHITE; });
  return board;
};
