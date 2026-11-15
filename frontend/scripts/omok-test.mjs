// 오목 규칙 엔진·AI 검증 (규칙: src/pages/play/omok/RULES.md)
// 실행: node scripts/omok-test.mjs            (규칙 + AI 자동 대전)
//       node scripts/omok-test.mjs --quick    (AI 자동 대전 생략)
// 서버 대조 파일 다시 만들기: node scripts/omok-test.mjs --fixture ../src/test/resources/omok
//   games.json: 무작위 대국 기록(수순, 수마다의 금수 자리, 결과) — 서버 OmokRules 가 똑같이 판정하는지 확인
import fs from 'node:fs';
import path from 'node:path';
import {
  SIZE, CELLS, EMPTY, BLACK, WHITE, RULES, toIdx, coordOf, forbiddenReason, forbiddenPoints, winLineAt,
  newGame, playMove, moveError, replay, needsExactFive, isRestricted,
} from '../src/pages/play/omok/engine.js';
import { chooseMove } from '../src/pages/play/omok/ai.js';

let failed = 0;
let passed = 0;
const check = (label, cond) => {
  if (cond) passed += 1;
  else { failed += 1; console.log(`FAIL ${label}`); }
};
const eq = (label, got, want) => check(`${label} (기대 ${want}, 실제 ${got})`, got === want);

/** 그림으로 판 만들기: X 흑, O 백, * 시험할 빈칸, 그 밖은 빈칸. 왼쪽 위(0,0)부터 */
const B = (...rows) => {
  const board = new Int8Array(CELLS);
  let target = -1;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === 'X') board[toIdx(x, y)] = BLACK;
    else if (ch === 'O') board[toIdx(x, y)] = WHITE;
    else if (ch === '*') target = toIdx(x, y);
  }));
  return { board, target };
};
const flip = (board) => board.map((c) => (c ? 3 - c : 0));
const why = (pos, color, rule) => forbiddenReason(pos.board, pos.target, color, rule);

// ── 1. 기본: 좌표, 승리 판정
eq('천원 H8', coordOf(toIdx(7, 7)), 'H8');
eq('왼쪽 위 A15', coordOf(0), 'A15');
eq('오른쪽 아래 O1', coordOf(CELLS - 1), 'O1');
{
  const five = B('', '.XXXX*');
  for (const rule of RULES) {
    five.board[five.target] = BLACK;
    eq(`${rule}: 흑 5목 승리`, winLineAt(five.board, five.target, BLACK, rule)?.length, 5);
    five.board[five.target] = EMPTY;
  }
  for (const [name, rows] of [['세로', ['.X', '.X', '.*', '.X', '.X']], ['대각 ↘', ['X', '.X', '..*', '...X', '....X']], ['대각 ↗', ['....X', '...X', '..*', '.X', 'X']]]) {
    const p = B(...rows);
    p.board[p.target] = BLACK;
    eq(`${name} 5목`, winLineAt(p.board, p.target, BLACK, 'renju')?.length, 5);
  }
}

// ── 2. 3-3
{
  const p = B('', '', '', '', '.....X', '....X*X', '.....X');
  eq('렌주: 흑 3-3 금수', why(p, BLACK, 'renju'), 'three3');
  eq('렌주: 백은 3-3 가능', forbiddenReason(flip(p.board), p.target, WHITE, 'renju'), null);
  eq('일반룰: 흑 3-3 금수', why(p, BLACK, 'standard'), 'three3');
  eq('일반룰: 백도 3-3 금수', forbiddenReason(flip(p.board), p.target, WHITE, 'standard'), 'three3');
  eq('자유룰: 3-3 가능', why(p, BLACK, 'free'), null);
  // 띈 3 이 낀 3-3
  const q = B('', '', '', '', '.....X', '...X.*X', '.....X');
  eq('띈 3 + 3 도 3-3', why(q, BLACK, 'renju'), 'three3');
  // 대각선 두 줄
  const r = B('', '', '...X...X', '....X.X', '.....*');
  eq('대각선 3-3', why(r, BLACK, 'renju'), 'three3');
}

// ── 3. 3이 아닌 줄 (열린 4를 만들 수 없음) → 3-3 아님
{
  // 가로가 한쪽이 백으로 막힘: OXX* → 닫힌 4만 됨
  eq('막힌 3 + 3 은 가능', why(B('', '', '', '', '...X', 'OXX*', '...X'), BLACK, 'renju'), null);
  // 판 끝에 붙은 3
  eq('판 끝의 3 + 3 은 가능', why(B('', '', '', '', '..X', 'XX*', '..X'), BLACK, 'renju'), null);
  // 양쪽에 한 칸씩 띄고 백: O.XX*.O → 어느 쪽으로 늘려도 닫힌 4
  eq('양쪽이 좁은 3 + 3 은 가능', why(B('', '', '', '', '....X', 'O.XX*.O', '....X'), BLACK, 'renju'), null);
  // 한쪽만 좁으면 반대쪽으로 열린 4가 되므로 3
  eq('한쪽만 좁은 3 + 3 은 금수', why(B('', '', '', '', '....X', 'O.XX*..', '....X'), BLACK, 'renju'), 'three3');
  // 장목 때문에 열린 4가 못 되는 3: X..XX*..X → 양쪽 다 한쪽 완성점이 6목
  eq('장목에 걸리는 3 + 3 은 가능(렌주 흑)', why(B('', '', '', '', '.....X', 'X..XX*..X', '.....X'), BLACK, 'renju'), null);
  eq('장목에 걸리는 3 + 3 은 가능(일반룰)', why(B('', '', '', '', '.....X', 'X..XX*..X', '.....X'), BLACK, 'standard'), null);
  eq('한쪽만 장목에 걸리면 3', why(B('', '', '', '', '.....X', 'X..XX*...', '.....X'), BLACK, 'renju'), 'three3');
}

// ── 4. 4-3, 4-4, 4-3-3
{
  const p43 = B('', '', '', '', '.....X', '..XXX*', '.....X');
  eq('4-3 은 가능', why(p43, BLACK, 'renju'), null);
  const p44 = B('', '', '.....X', '.....X', '.....X', '..XXX*');
  eq('렌주: 흑 4-4 금수', why(p44, BLACK, 'renju'), 'four4');
  eq('렌주: 백 4-4 가능', forbiddenReason(flip(p44.board), p44.target, WHITE, 'renju'), null);
  eq('일반룰: 4-4 가능', why(p44, BLACK, 'standard'), null);
  eq('자유룰: 4-4 가능', why(p44, BLACK, 'free'), null);
  // 한 줄 4-4 세 가지
  eq('한 줄 4-4: X.X*X.X', why(B('', 'X.X*X.X'), BLACK, 'renju'), 'four4');
  eq('한 줄 4-4: XX.*X.XX', why(B('', 'XX.*X.XX'), BLACK, 'renju'), 'four4');
  eq('한 줄 4-4: XXX.*.XXX', why(B('', 'XXX.*.XXX'), BLACK, 'renju'), 'four4');
  // 열린 4 하나는 4 하나
  eq('열린 4 하나는 가능', why(B('', '.XX*X.'), BLACK, 'renju'), null);
  // 막힌 4 + 띈 4
  eq('띈 4 가 낀 4-4', why(B('', '', '.....X', '.....X', '', '.XX.X*', '.....X'), BLACK, 'renju'), 'four4');
  // 4-3-3
  const p433 = B('', '', '...X.X.X', '....XXX', '..XXX*', '', '');
  eq('4-3-3 은 금수', why(p433, BLACK, 'renju'), 'three3');
  // 4-4-3
  const p443 = B('', '', '.....X.X', '.....XX', '..XXX*', '.....X');
  eq('4-4-3 은 금수', why(p443, BLACK, 'renju'), 'four4');
}

// ── 5. 장목
{
  const over = B('', 'XXX*XX');
  eq('렌주: 흑 장목 금수', why(over, BLACK, 'renju'), 'overline');
  eq('렌주: 백 장목 가능', forbiddenReason(flip(over.board), over.target, WHITE, 'renju'), null);
  eq('일반룰: 장목은 둘 수 있음', why(over, BLACK, 'standard'), null);
  const b = flip(over.board);
  b[over.target] = WHITE;
  eq('렌주: 백 장목은 승리', winLineAt(b, over.target, WHITE, 'renju')?.length, 6);
  eq('일반룰: 백 장목은 승리 아님', winLineAt(b, over.target, WHITE, 'standard'), null);
  eq('자유룰: 장목은 승리', winLineAt(b, over.target, WHITE, 'free')?.length, 6);
  const bb = Int8Array.from(over.board);
  bb[over.target] = BLACK;
  eq('일반룰: 흑 장목도 승리 아님', winLineAt(bb, over.target, BLACK, 'standard'), null);
  eq('자유룰: 흑 장목 승리', winLineAt(bb, over.target, BLACK, 'free')?.length, 6);
  // 7목
  eq('렌주: 흑 7목 금수', why(B('', 'XXX*XXX'), BLACK, 'renju'), 'overline');
}

// ── 6. 5목이 금수 모양보다 우선
{
  // 가로 5목 + 세로·대각 3-3 모양
  const p = B('', '', '', '', '....X.X', 'XX.XX*', '....X.X');
  p.board[toIdx(2, 5)] = BLACK; // XXXXX* 는 6목이 되므로 4개만: .XXXX*
  p.board[toIdx(0, 5)] = EMPTY;
  eq('5목 + 3-3 모양: 금수 아님', why(p, BLACK, 'renju'), null);
  const p2 = B('', '', '.....X', '.....X', '.....X', '.XXXX*', '', '');
  p2.board[toIdx(5, 1)] = BLACK; // 세로는 4개(1~4행) + 놓는 자리 = 5목, 가로도 5목
  eq('5목 두 줄: 금수 아님', why(p2, BLACK, 'renju'), null);
  // 5목 + 다른 줄 장목
  const p3 = B('', 'XXX*XX', '...X', '...X', '...X', '...X');
  eq('5목(세로) + 장목(가로): 5목이 우선', why(p3, BLACK, 'renju'), null);
}

// ── 7. 거짓 금수: 열린 4를 만들 자리가 금수인 3은 3이 아니다
{
  // 가로 O.XX*.. 는 (5,6)에 두어야만 열린 4. 그 자리가 세로 4와 겹쳐 4-4 금수 → 가로는 3이 아님
  const rows = ['', '', '', '.....X', '.....X', '.....X', 'O.XX*..', '....X', '....X'];
  eq('거짓 금수(4-4 자리): 둘 수 있음', why(B(...rows), BLACK, 'renju'), null);
  eq('그 열린 4 자리는 4-4 금수', (() => {
    const b = B(...rows).board;
    b[toIdx(4, 6)] = BLACK;
    return forbiddenReason(b, toIdx(5, 6), BLACK, 'renju');
  })(), 'four4');
  // 세로 돌 하나를 빼면 그 자리는 4-3 → 가로가 진짜 3 → 3-3 금수
  const rows2 = [...rows];
  rows2[3] = '';
  eq('세로가 2개뿐이면 진짜 3-3', why(B(...rows2), BLACK, 'renju'), 'three3');
  // 일반룰에는 4-4 금수가 없으므로 거짓 금수가 아니다
  eq('일반룰에서는 3-3 금수', why(B(...rows), BLACK, 'standard'), 'three3');

  // 열린 4 자리가 3-3(4-3-3) 금수인 경우 (RIF 9.3 의 되풀이 판정)
  const rows3 = ['', '', '', '', '.....X', '.....X', 'O.XX*..', '....X.X', '....X..X'];
  eq('열린 4 자리 (5,6) 은 4-3-3 금수', (() => {
    const b = B(...rows3).board;
    b[toIdx(4, 6)] = BLACK;
    return forbiddenReason(b, toIdx(5, 6), BLACK, 'renju');
  })(), 'three3');
  eq('거짓 금수(3-3 자리): 둘 수 있음', why(B(...rows3), BLACK, 'renju'), null);

  // 열린 4 자리가 장목 금수인 경우: 세로로 6목이 되는 자리
  const rows4 = ['', '.....X', '.....X', '.....X', '', '.....X', 'O.XX*..', '....X', '....X'];
  rows4[4] = '.....X';
  rows4[1] = '';
  rows4[7] = '....XX';
  // (5,6)에 두면 세로 2~7행 6목 → 장목 금수
  eq('열린 4 자리가 장목 금수', (() => {
    const b = B(...rows4).board;
    b[toIdx(4, 6)] = BLACK;
    return forbiddenReason(b, toIdx(5, 6), BLACK, 'renju');
  })(), 'overline');
  eq('거짓 금수(장목 자리): 둘 수 있음', why(B(...rows4), BLACK, 'renju'), null);
}

// ── 8. 독립 구현과 대조 (줄을 문자열로 다루는 느린 판정기)
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
const ref = {
  at: (b, x, y) => (x < 0 || y < 0 || x >= SIZE || y >= SIZE ? -1 : b[y * SIZE + x]),
  // (x,y)를 지나는 줄을 한 줄 배열로: [cells, 그 안에서 (x,y)의 위치]
  line(b, x, y, d) {
    const cells = [];
    let pos = -1;
    for (let k = -14; k <= 14; k += 1) {
      const cx = x + k * DIRS[d][0];
      const cy = y + k * DIRS[d][1];
      if (ref.at(b, cx, cy) < 0) continue;
      if (k === 0) pos = cells.length;
      cells.push({ idx: cy * SIZE + cx, c: b[cy * SIZE + cx] });
    }
    return [cells, pos];
  },
  runAt(cells, pos, color) {
    let s = pos;
    let e = pos;
    while (s > 0 && cells[s - 1].c === color) s -= 1;
    while (e < cells.length - 1 && cells[e + 1].c === color) e += 1;
    return [s, e];
  },
  ok: (len, exact) => (exact ? len === 5 : len >= 5),
  // 줄 위의 모든 빈칸을 하나씩 채워 보며, pos 를 포함한 5목이 되는 자리를 센다
  fiveSpots(cells, pos, color, exact) {
    const out = [];
    cells.forEach((cell, i) => {
      if (cell.c !== EMPTY) return;
      cell.c = color;
      const [s, e] = ref.runAt(cells, i, color);
      cell.c = EMPTY;
      if (s <= pos && pos <= e && ref.ok(e - s + 1, exact)) out.push(i);
    });
    return out;
  },
  reason(b, idx, color, rule) {
    if (!isRestricted(rule, color) || b[idx] !== EMPTY) return null;
    const exact = needsExactFive(rule, color);
    const x = idx % SIZE;
    const y = (idx - x) / SIZE;
    b[idx] = color;
    try {
      const lines = [0, 1, 2, 3].map((d) => ref.line(b, x, y, d));
      const lens = lines.map(([cells, pos]) => { const [s, e] = ref.runAt(cells, pos, color); return e - s + 1; });
      if (lens.some((l) => ref.ok(l, exact))) return null;
      if (rule === 'renju' && lens.some((l) => l >= 6)) return 'overline';
      let fours = 0;
      let threes = 0;
      lines.forEach(([cells, pos], d) => {
        if (lens[d] >= 5) return;
        const spots = ref.fiveSpots(cells, pos, color, exact);
        if (spots.length) {
          const straight = spots.length === 2 && spots[1] - spots[0] === 5 && lens[d] === 4;
          fours += straight ? 1 : spots.length;
          return;
        }
        // 3: 빈칸 하나를 채워 pos 를 포함한 열린 4(연속 4개, 양 끝이 모두 5목 완성점)가 되고, 그 빈칸이 금수가 아님
        const isThree = cells.some((cell, i) => {
          if (cell.c !== EMPTY) return false;
          cell.c = color;
          const [s, e] = ref.runAt(cells, i, color);
          let straight = false;
          if (e - s + 1 === 4 && s <= pos && pos <= e) {
            const sp = ref.fiveSpots(cells, i, color, exact);
            straight = sp.length === 2 && sp[0] === s - 1 && sp[1] === e + 1;
          }
          cell.c = EMPTY;
          return straight && ref.reason(b, cell.idx, color, rule) === null;
        });
        if (isThree) threes += 1;
      });
      if (rule === 'renju' && fours >= 2) return 'four4';
      return threes >= 2 ? 'three3' : null;
    } finally {
      b[idx] = EMPTY;
    }
  },
};

// 재현 가능한 난수
const rngOf = (seed) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

{
  const rng = rngOf(20261114);
  let compared = 0;
  let mismatches = 0;
  const seen = { three3: 0, four4: 0, overline: 0 };
  for (let n = 0; n < 1500; n += 1) {
    // 가운데 9x9 에 돌을 몰아 금수 모양이 자주 생기게 한다
    const board = new Int8Array(CELLS);
    const stones = 14 + Math.floor(rng() * 30);
    for (let i = 0; i < stones; i += 1) {
      const x = 3 + Math.floor(rng() * 9);
      const y = 3 + Math.floor(rng() * 9);
      board[toIdx(x, y)] = rng() < 0.62 ? BLACK : WHITE;
    }
    for (const rule of ['renju', 'standard']) {
      for (const color of [BLACK, WHITE]) {
        for (let idx = 0; idx < CELLS; idx += 1) {
          if (board[idx] !== EMPTY) continue;
          const a = forbiddenReason(board, idx, color, rule);
          const b = ref.reason(board, idx, color, rule);
          compared += 1;
          if (a) seen[a] += 1;
          if (a !== b && mismatches++ < 5) console.log(`  불일치 ${rule} ${color === BLACK ? '흑' : '백'} ${coordOf(idx)}: 엔진 ${a}, 대조 ${b}`);
        }
      }
    }
  }
  eq(`독립 구현 대조 ${compared}칸 불일치`, mismatches, 0);
  check(`대조에 금수 세 종류가 모두 나옴 (${JSON.stringify(seen)})`, seen.three3 > 100 && seen.four4 > 100 && seen.overline > 100);
}

// ── 9. 대국 진행
{
  let g = newGame('renju');
  eq('흑 선공', g.turn, BLACK);
  g = playMove(g, toIdx(7, 7));
  eq('다음은 백', g.turn, WHITE);
  eq('둔 자리에 또 두면 거부', moveError(g, toIdx(7, 7)), 'occupied');
  eq('판 밖은 거부', moveError(g, 225), 'occupied');
  // 흑 가로 5목
  const seq = [[7, 7], [7, 8], [8, 7], [8, 8], [9, 7], [9, 8], [10, 7], [10, 8], [11, 7]].map(([x, y]) => toIdx(x, y));
  const done = replay('renju', seq);
  eq('5목으로 종료', done.status, 'FINISHED');
  eq('승자 흑', done.winner, BLACK);
  eq('승리 줄 5칸', done.winLine.length, 5);
  eq('끝난 판에는 둘 수 없음', moveError(done, 0), 'finished');
  // 금수 수는 playMove 가 null
  const p = B('', '', '', '', '.....X', '....X*X', '.....X');
  const fg = { ...newGame('renju'), board: p.board };
  eq('금수 착수는 거부', playMove(fg, p.target), null);
  eq('금수 표시 목록에 포함', forbiddenPoints(p.board, BLACK, 'renju')[p.target], 'three3');
  eq('백 차례에는 금수 표시 없음', Object.keys(forbiddenPoints(p.board, WHITE, 'renju')).length, 0);
  // 일반룰: 장목을 두어도 계속, 이후 정확한 5목으로 승리
  const og = { ...newGame('standard'), board: B('', 'XXX.XX').board };
  const after = playMove(og, toIdx(3, 1));
  eq('일반룰: 장목 뒤에도 진행 중', after.status, 'PLAYING');
  // 판이 다 차면 무승부 (5목이 없는 채움 무늬)
  const full = newGame('free');
  const pat = (x, y) => (((x + 2 * (y % 2 === 0 ? 0 : 1)) % 4 < 2) ? BLACK : WHITE);
  // 2칸씩 번갈아 놓는 무늬: 가로 최대 2, 세로·대각도 5 미만
  let ok = true;
  const b = new Int8Array(CELLS);
  for (let i = 0; i < CELLS; i += 1) b[i] = pat(i % SIZE, (i / SIZE) | 0);
  for (let i = 0; i < CELLS && ok; i += 1) if (winLineAt(b, i, b[i], 'free')) ok = false;
  check('무승부 시험용 무늬에 5목 없음', ok);
  if (ok) {
    const blacks = [...b.keys()].filter((i) => b[i] === BLACK);
    const whites = [...b.keys()].filter((i) => b[i] === WHITE);
    // 흑이 한 수 더 많아야 번갈아 둘 수 있다
    const moves = [];
    for (let i = 0; i < CELLS; i += 1) moves.push(i % 2 === 0 ? blacks[i >> 1] : whites[i >> 1]);
    if (blacks.length === 113 && whites.length === 112) {
      const end = replay('free', moves);
      eq('판이 다 차면 무승부', `${end.status}/${end.winner}/${end.reason}`, 'FINISHED/null/full');
      void full;
    } else check(`무늬의 흑백 수 (${blacks.length}/${whites.length})`, false);
  }
}

// ── 10. 무작위 대국 기록 (서버 대조용 + 엔진 자체 일관성)
const randomGames = (count, seed) => {
  const rng = rngOf(seed);
  const games = [];
  for (let n = 0; n < count; n += 1) {
    const rule = RULES[n % 3];
    let g = newGame(rule);
    const forb = [];
    const rejected = [];
    while (g.status === 'PLAYING') {
      const f = forbiddenPoints(g.board, g.turn, g.rule);
      const fKeys = Object.keys(f).map(Number).sort((a, b) => a - b);
      forb.push(fKeys.map((k) => `${k}:${f[k]}`).join(','));
      // 금수 자리가 있으면 가끔 일부러 두어 본다 → 거부되어야 함
      if (fKeys.length && rng() < 0.5) rejected.push([g.moves.length, fKeys[0], f[fKeys[0]]]);
      // 돌 근처에 몰아서 둔다 (금수·5목이 잘 나오게)
      let idx = -1;
      for (let tries = 0; tries < 400 && idx < 0; tries += 1) {
        const base = g.moves.length ? g.moves[Math.floor(rng() * g.moves.length)] : toIdx(7, 7);
        const x = (base % SIZE) + Math.floor(rng() * 5) - 2;
        const y = ((base / SIZE) | 0) + Math.floor(rng() * 5) - 2;
        if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) continue;
        if (moveError(g, toIdx(x, y)) === null) idx = toIdx(x, y);
      }
      if (idx < 0) idx = [...g.board.keys()].find((i) => moveError(g, i) === null);
      g = playMove(g, idx);
    }
    games.push({
      rule, moves: g.moves, forbidden: forb, rejected,
      winner: g.winner === BLACK ? 'BLACK' : g.winner === WHITE ? 'WHITE' : null,
      reason: g.reason, winLine: g.winLine || [],
    });
  }
  return games;
};

{
  const games = randomGames(90, 7);
  const byRule = (r) => games.filter((g) => g.rule === r);
  check('무작위 대국: 모두 종료', games.every((g) => g.reason === 'five' || g.reason === 'full'));
  check('무작위 대국: 렌주에서 흑 금수가 실제로 나옴', byRule('renju').some((g) => g.forbidden.some((f) => f)));
  check('무작위 대국: 일반룰에서 백 금수도 나옴', byRule('standard').some((g) => g.forbidden.some((f, i) => f && i % 2 === 1)));
  check('무작위 대국: 자유룰은 금수 없음', byRule('free').every((g) => g.forbidden.every((f) => !f)));
  check('무작위 대국: 렌주 백 차례에는 금수 없음', byRule('renju').every((g) => g.forbidden.every((f, i) => !f || i % 2 === 0)));
  const fixtureAt = process.argv.indexOf('--fixture');
  if (fixtureAt > 0) {
    const dir = process.argv[fixtureAt + 1];
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'games.json'), JSON.stringify(games));
    console.log(`서버 대조 파일 기록: ${path.join(dir, 'games.json')} (${games.length}판)`);
  }
}

// ── 11. AI
const playout = (rule, blackLevel, whiteLevel, seed, time) => {
  const rng = rngOf(seed);
  let g = newGame(rule);
  let slowest = 0;
  while (g.status === 'PLAYING') {
    const level = g.turn === BLACK ? blackLevel : whiteLevel;
    const t0 = Date.now();
    const { move } = chooseMove(rule, g.moves, level, { rng, time });
    slowest = Math.max(slowest, Date.now() - t0);
    const next = move >= 0 ? playMove(g, move) : null;
    if (!next) return { illegal: true, g, level, move };
    g = next;
  }
  return { g, slowest };
};

{
  // 한 수 문제: 5목 완성, 4 막기, 열린 3 막기, 금수 유도
  const mv = (rule, rows, level = 'hard') => {
    const { board } = B(...rows);
    // 판을 수순으로 바꾼다 (흑백 번갈아, 모자라는 쪽은 구석에 채움)
    const blacks = [...board.keys()].filter((i) => board[i] === BLACK);
    const whites = [...board.keys()].filter((i) => board[i] === WHITE);
    return { blacks, whites, level, rule };
  };
  const solve = ({ blacks, whites, level, rule }, turn) => {
    const moves = [];
    const b = [...blacks];
    const w = [...whites];
    const fillers = [toIdx(14, 14), toIdx(0, 14), toIdx(14, 0), toIdx(0, 0), toIdx(14, 7), toIdx(0, 7)];
    const need = turn === BLACK ? [Math.max(b.length, w.length), Math.max(b.length, w.length)] : [Math.max(b.length, w.length + 1), Math.max(b.length - 1, w.length)];
    while (b.length < need[0]) b.push(fillers.pop());
    while (w.length < need[1]) w.push(fillers.pop());
    for (let i = 0; i < b.length + w.length; i += 1) moves.push(i % 2 === 0 ? b[i >> 1] : w[i >> 1]);
    return chooseMove(rule, moves, level, { rng: rngOf(1) }).move;
  };
  for (const level of ['easy', 'normal', 'hard']) {
    const fin = coordOf(solve(mv('renju', ['', '', '', '', '', '...XXXX', '...OOO'], level), BLACK));
    check(`${level}: 5목을 완성 (${fin})`, fin === 'C10' || fin === 'H10');
    const blk = coordOf(solve(mv('renju', ['', '', '', '', '', '..OXXXX', '...OO'], level), WHITE));
    eq(`${level}: 4를 막음`, blk, 'H10');
  }
  for (const level of ['normal', 'hard']) {
    const m = coordOf(solve(mv('free', ['', '', '', '', '', '....XXX', '....O', '.....O'], level), WHITE));
    check(`${level}: 열린 3을 막음 (${m})`, ['D10', 'H10', 'C10', 'I10'].includes(m));
    // 열린 4를 만들 수 있으면 만든다
    const a = coordOf(solve(mv('free', ['', '', '', '', '', '....XXX', '....OO', '....O'], level), BLACK));
    check(`${level}: 열린 4를 만듦 (${a})`, ['D10', 'H10'].includes(a));
  }
  // 렌주 백: 흑이 막을 자리가 금수(3-3)인 4를 두어 이긴다 (금수 유도)
  {
    // 백 대각선 (6,6)(7,7)(8,8). (5,5) 는 흑의 3-3 자리, (4,4)·(10,10) 은 흑 돌.
    // 백이 (9,9)=J6 에 두면 남은 완성점이 (5,5) 뿐인데 흑은 금수라 막지 못한다. (5,5)에 두면 흑이 (9,9)로 막는다.
    const rows = ['', '', '', '', '....XX', '....X.X', '.....XO', '.......O', '........O', '', '..........X'];
    eq('금수 유도 문제: (5,5) 는 흑의 3-3', forbiddenReason(B(...rows).board, toIdx(5, 5), BLACK, 'renju'), 'three3');
    for (const level of ['normal', 'hard']) {
      eq(`${level}(백): 금수 유도로 이기는 수`, coordOf(solve(mv('renju', rows, level), WHITE)), 'J6');
    }
    // 자유룰이면 흑이 막을 수 있으므로 필승이 아니다 → 다른 판단을 해도 됨 (수를 두기만 하면 통과)
    check('free(백): 수를 둠', solve(mv('free', rows), WHITE) >= 0);
  }

  if (!process.argv.includes('--quick')) {
    const tally = (label, rule, strong, weak, games, time, needWins) => {
      let wins = 0;
      let draws = 0;
      let illegal = 0;
      let slow = 0;
      let lens = 0;
      for (let i = 0; i < games; i += 1) {
        const strongBlack = i % 2 === 0;
        const r = playout(rule, strongBlack ? strong : weak, strongBlack ? weak : strong, 1000 + i, time);
        if (r.illegal) { illegal += 1; console.log(`  잘못된 수: ${r.level} ${r.move}`); continue; }
        slow = Math.max(slow, r.slowest);
        lens += r.g.moves.length;
        if (r.g.winner == null) draws += 1;
        else if ((r.g.winner === BLACK) === strongBlack) wins += 1;
      }
      console.log(`  ${label}: ${strong} ${wins}승 ${draws}무 ${games - wins - draws}패 / ${games}판, 평균 ${Math.round(lens / games)}수, 가장 오래 걸린 수 ${slow}ms`);
      eq(`${label}: 잘못된 수 없음`, illegal, 0);
      check(`${label}: ${strong} 이 ${needWins}승 이상 (${wins})`, wins >= needWins);
      return slow;
    };
    console.log('AI 자동 대전 (흑백을 번갈아 잡음)');
    for (const rule of RULES) {
      tally(`${rule} 어려움 vs 쉬움`, rule, 'hard', 'easy', 12, 250, 12);
    }
    tally('renju 보통 vs 쉬움', 'renju', 'normal', 'easy', 12, 250, 10);
    tally('renju 어려움 vs 보통', 'renju', 'hard', 'normal', 12, 400, 8);
    // 실제 설정 시간으로 둘 때 응답 시간
    const slow = tally('renju 어려움 vs 보통 (실제 생각 시간)', 'renju', 'hard', 'normal', 2, undefined, 1);
    check(`어려움의 한 수가 2초 안 (${slow}ms)`, slow < 2000);
  }
}

console.log(`\n${passed} 통과, ${failed} 실패`);
process.exit(failed ? 1 : 0);
