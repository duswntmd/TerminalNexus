// 오목 묘수풀이 문제 만들기 (한 번 돌려 src/pages/play/omok/puzzles.js 를 만든다)
// AI끼리 둔 대국에서 "둘 차례인 쪽이 연속 4로만 이기는" 장면을 골라, 몇 수 만에 이기는지로 난이도를 나눈다.
// 실행: node scripts/omok-puzzles-gen.mjs [대국 수]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CELLS, BLACK, newGame, playMove } from '../src/pages/play/omok/engine.js';
import { chooseMove } from '../src/pages/play/omok/ai.js';
import { boardOf, fivePoints, vcfLength, winningFirstMoves } from '../src/pages/play/omok/puzzle.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GAMES = Number(process.argv[2] || 160);
const WANT = { 2: 8, 3: 12, 4: 12, 5: 10, 6: 8 }; // 공격 쪽 수 → 문제 수

// 재현 가능한 난수
let seed = 20261121;
const rng = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed / 2147483648;
};

const found = { 2: [], 3: [], 4: [], 5: [], 6: [] };
const seen = new Set();
const RULE = 'renju';

for (let g = 0; g < GAMES; g += 1) {
  let game = newGame(RULE);
  // 한쪽은 쉬움(실수가 잦음), 다른 쪽은 보통 → 결정적인 장면이 자주 생긴다
  const weak = g % 2 === 0 ? BLACK : 3 - BLACK;
  const taken = new Set(); // 같은 대국에서는 한 문제만 (앞뒤 수순 장면이 거의 같다)
  while (game.status === 'PLAYING' && game.moves.length < 120) {
    const n = game.moves.length;
    if (n >= 9) {
      const board = boardOf(game.moves);
      const me = n % 2 === 0 ? BLACK : 3 - BLACK;
      const key = game.moves.slice().sort((a, b) => a - b).join(',') + `|${me}`;
      // 바로 5목이 되거나, 상대 5목을 막아야만 하는 장면은 뺀다
      if (!seen.has(key) && !fivePoints(board, me, RULE).length && !fivePoints(board, 3 - me, RULE).length) {
        seen.add(key);
        const len = vcfLength(board, me, RULE, 6);
        if (len >= 2 && found[len] && taken.size === 0 && found[len].length < WANT[len] * 3) {
          const firsts = winningFirstMoves(board, me, RULE, len);
          // 첫 수 정답이 너무 많으면 문제로 재미가 없다
          if (firsts.length <= 2) {
            found[len].push({ moves: game.moves.slice(), n: len, answers: firsts.length });
            taken.add(len);
          }
        }
      }
    }
    const level = game.turn === weak ? 'easy' : 'normal';
    const { move } = chooseMove(RULE, game.moves, level, { time: 60, rng });
    const next = move >= 0 ? playMove(game, move) : null;
    if (!next) break;
    game = next;
  }
  if (g % 20 === 19) console.log(`${g + 1}판:`, Object.entries(found).map(([k, v]) => `${k}수 ${v.length}`).join(', '));
}

// 난이도별로 고르게: 흑·백 섞고, 대국 앞쪽(돌이 적은) 장면을 먼저
const out = [];
for (const [len, list] of Object.entries(found)) {
  const pick = [];
  const byColor = [list.filter((p) => p.moves.length % 2 === 0), list.filter((p) => p.moves.length % 2 === 1)];
  for (let i = 0; pick.length < WANT[len] && i < list.length; i += 1) {
    for (const side of byColor) if (side[i] && pick.length < WANT[len]) pick.push(side[i]);
  }
  pick.sort((a, b) => a.moves.length - b.moves.length);
  out.push(...pick);
  console.log(`${len}수: 후보 ${list.length}개 중 ${pick.length}개`);
}

const body = out.map((p, i) => `  { id: ${i + 1}, n: ${p.n}, moves: [${p.moves.join(', ')}] },`).join('\n');
const file = `// 자동 생성: node scripts/omok-puzzles-gen.mjs (손으로 고치지 말 것)
// n: 공격 쪽이 5목까지 두는 수. 둘 차례는 moves 길이로 정해진다 (짝수면 흑).
// 모두 렌주룰. 정답 검증은 scripts/omok-test.mjs.
export const PUZZLE_RULE = 'renju';
export const PUZZLES = [
${body}
];
`;
fs.writeFileSync(path.join(ROOT, 'src/pages/play/omok/puzzles.js'), file);
console.log(`문제 ${out.length}개 저장 (칸 수 ${CELLS})`);
