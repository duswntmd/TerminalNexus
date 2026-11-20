// 리버시 규칙 엔진·AI 검증 (규칙: src/pages/play/reversi/RULES.md)
// 실행: node scripts/reversi-test.mjs          (규칙 + AI 자동 대전)
//       node scripts/reversi-test.mjs --quick  (AI 자동 대전 생략)
import {
  CELLS, EMPTY, BLACK, WHITE, PASS, coordOf, flipsFor, legalMoves, countOf, newGame, playMove, replay, initialBoard,
} from '../src/pages/play/reversi/engine.js';
import { chooseMove } from '../src/pages/play/reversi/ai.js';

let passed = 0;
let failed = 0;
const check = (label, cond) => {
  if (cond) passed += 1;
  else { failed += 1; console.log('실패:', label); }
};
const eq = (label, got, want) => check(`${label} (기대 ${JSON.stringify(want)}, 실제 ${JSON.stringify(got)})`, JSON.stringify(got) === JSON.stringify(want));
const at = (s) => (s.charCodeAt(0) - 97) + (Number(s[1]) - 1) * 8;
const rngOf = (seed) => () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

// ── 1. 시작 판과 첫 수
{
  const g = newGame();
  eq('시작 돌 수', countOf(g.board), { [BLACK]: 2, [WHITE]: 2 });
  eq('흑 먼저', g.turn, BLACK);
  eq('흑의 첫 수 4곳', legalMoves(g.board, BLACK).map(coordOf).sort(), ['c4', 'd3', 'e6', 'f5']);
  eq('d3 은 d4 를 뒤집음', flipsFor(g.board, at('d3'), BLACK).map(coordOf), ['d4']);
  eq('빈 곳 아무 데나는 불가', playMove(g, at('a1')), null);
  const g2 = playMove(g, at('d3'));
  eq('d3 뒤 돌 수', countOf(g2.board), { [BLACK]: 4, [WHITE]: 1 });
  eq('d3 뒤 백 차례', g2.turn, WHITE);
  eq('좌표 이름', [coordOf(0), coordOf(63), coordOf(PASS)], ['a1', 'h8', 'pass']);
}

// ── 2. 여러 방향 동시에 뒤집기
{
  const b = new Int8Array(CELLS);
  // d4 에 흑을 두면 가로·세로·대각선 3방향의 백을 뒤집는 판
  b[at('b4')] = BLACK; b[at('c4')] = WHITE;
  b[at('d2')] = BLACK; b[at('d3')] = WHITE;
  b[at('f6')] = BLACK; b[at('e5')] = WHITE;
  b[at('f4')] = WHITE; // 끝에 흑이 없으므로 뒤집히지 않음
  eq('3방향 뒤집기', flipsFor(b, at('d4'), BLACK).map(coordOf).sort(), ['c4', 'd3', 'e5']);
  eq('막히지 않은 줄은 안 뒤집음', flipsFor(b, at('g4'), BLACK).length, 0);
}

// ── 3. 패스와 끝
{
  // 흑이 a1, 백이 b1·c1 만 → 흑이 d1 에 두면 백 0개, 둘 다 둘 곳 없음 → 끝
  const g = { ...newGame(), board: new Int8Array(CELLS) };
  g.board[at('a1')] = BLACK; g.board[at('b1')] = WHITE; g.board[at('c1')] = WHITE;
  const end = playMove(g, at('d1'));
  eq('전멸이면 끝', end.status, 'FINISHED');
  eq('흑 승', end.winner, BLACK);

  // 백이 둘 곳이 없고 흑은 있으면 자동 패스
  const p = { ...newGame(), board: new Int8Array(CELLS) };
  p.board[at('a1')] = BLACK; p.board[at('b1')] = WHITE; p.board[at('h8')] = BLACK; p.board[at('g8')] = WHITE; p.board[at('a8')] = WHITE;
  const after = playMove(p, at('c1'));
  eq('백 패스 → 다시 흑 차례', after.turn, BLACK);
  eq('패스 기록', after.moves.slice(-1), [PASS]);
  check('흑은 둘 곳이 있음', legalMoves(after.board, BLACK).length > 0);
}

// ── 4. 무작위 대국: 돌 수 보존, 수순 재현
{
  const rng = rngOf(7);
  let games = 0;
  for (let k = 0; k < 300; k += 1) {
    let g = newGame();
    while (g.status === 'PLAYING') {
      const ms = legalMoves(g.board, g.turn);
      check('둘 차례인 쪽은 둘 곳이 있음', ms.length > 0);
      const m = ms[Math.floor(rng() * ms.length)];
      const before = countOf(g.board);
      const n = flipsFor(g.board, m, g.turn).length;
      const mover = g.turn;
      g = playMove(g, m);
      const c = countOf(g.board);
      if (c[mover] !== before[mover] + n + 1 || c[3 - mover] !== before[3 - mover] - n) { check('돌 수 보존', false); break; }
    }
    const filled = CELLS - Array.from(g.board).filter((x) => x === EMPTY).length;
    check('끝난 판에서 아무도 둘 곳 없음', !legalMoves(g.board, BLACK).length && !legalMoves(g.board, WHITE).length);
    const c = countOf(g.board);
    eq('승자 판정', g.winner, c[BLACK] === c[WHITE] ? null : c[BLACK] > c[WHITE] ? BLACK : WHITE);
    const r = replay(g.moves);
    check('수순 재현', r.status === 'FINISHED' && Array.from(r.board).join() === Array.from(g.board).join());
    check('채운 칸 수', filled === c[BLACK] + c[WHITE]);
    games += 1;
  }
  console.log(`무작위 대국 ${games}판 확인`);
  eq('초기 판 복사본', Array.from(initialBoard()).filter(Boolean).length, 4);
}

// ── 5. AI
{
  const g = newGame();
  const m = chooseMove(g.board, BLACK, 'hard', { time: 200 }).move;
  check('AI 첫 수는 둘 수 있는 자리', legalMoves(g.board, BLACK).includes(m));
  // 한 수로 상대 돌을 모두 없앨 수 있으면 그 수를 둔다 (막판 끝까지 읽기)
  const b = new Int8Array(CELLS);
  b[at('a1')] = BLACK; b[at('b1')] = WHITE; b[at('h8')] = WHITE; b[at('g8')] = BLACK; b[at('a8')] = BLACK; b[at('b7')] = WHITE;
  const best = chooseMove(b, BLACK, 'hard', { time: 300 }).move;
  check(`AI 는 둘 수 있는 수를 둠 (${coordOf(best)})`, legalMoves(b, BLACK).includes(best));
}

if (!process.argv.includes('--quick')) {
  const playout = (blackLevel, whiteLevel, seed, time) => {
    const rng = rngOf(seed);
    let g = newGame();
    // 같은 판만 반복되지 않게 처음 4수는 무작위
    for (let i = 0; i < 4 && g.status === 'PLAYING'; i += 1) {
      const ms = legalMoves(g.board, g.turn);
      g = playMove(g, ms[Math.floor(rng() * ms.length)]);
    }
    let slow = 0;
    while (g.status === 'PLAYING') {
      const lvl = g.turn === BLACK ? blackLevel : whiteLevel;
      const t0 = Date.now();
      const { move } = chooseMove(g.board, g.turn, lvl, { rng, time });
      slow = Math.max(slow, Date.now() - t0);
      const next = playMove(g, move);
      if (!next) { check(`AI 가 둘 수 없는 수 ${coordOf(move)}`, false); break; }
      g = next;
    }
    return { winner: g.winner, slow };
  };
  const tally = (label, strong, weak, games, time, need) => {
    let wins = 0;
    let slow = 0;
    for (let k = 0; k < games; k += 1) {
      const strongBlack = k % 2 === 0;
      const r = playout(strongBlack ? strong : weak, strongBlack ? weak : strong, 100 + k, time);
      if (r.winner === (strongBlack ? BLACK : WHITE)) wins += 1;
      slow = Math.max(slow, r.slow);
    }
    console.log(`  ${label}: ${wins}승 / ${games}판, 가장 오래 걸린 수 ${slow}ms`);
    check(`${label}: ${need}승 이상`, wins >= need);
    return slow;
  };
  console.log('AI 자동 대전');
  tally('보통 vs 쉬움', 'normal', 'easy', 12, undefined, 10);
  tally('어려움 vs 보통', 'hard', 'normal', 10, 300, 7);
  const slow = tally('어려움 vs 보통 (실제 시간)', 'hard', 'normal', 2, undefined, 1);
  check(`어려움 한 수가 2초 안 (${slow}ms)`, slow < 2000);
}

console.log(`\n${passed} 통과, ${failed} 실패`);
process.exit(failed ? 1 : 0);
