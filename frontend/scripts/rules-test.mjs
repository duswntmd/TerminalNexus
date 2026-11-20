// 규칙 가이드(src/content/rules.js)의 그림·숫자가 게임 엔진과 맞는지 확인한다.
// 실행: node scripts/rules-test.mjs
import { RULE_GUIDES } from '../src/content/rules.js';
import { SIZE, CELLS, BLACK, WHITE, toIdx, forbiddenReason, winLineAt } from '../src/pages/play/omok/engine.js';

let pass = 0;
let fail = 0;
const check = (ok, label) => {
  if (ok) pass++;
  else { fail++; console.log('실패:', label); }
};

// 오목 그림: 15×15 판 가운데에 놓고 * 자리의 흑 금수 여부를 엔진으로 확인
const VERDICT_RE = { three3: 'three3', four4: 'four4', overline: 'overline' };
for (const g of RULE_GUIDES) {
  for (const b of g.body.filter((x) => x.omok)) {
    const { rows, verdict, note } = b.omok;
    const board = new Array(CELLS).fill(0);
    const ox = Math.floor((SIZE - rows[0].length) / 2);
    const oy = Math.floor((SIZE - rows.length) / 2);
    let target = -1;
    rows.forEach((row, y) => [...row].forEach((ch, x) => {
      const i = toIdx(ox + x, oy + y);
      if (ch === 'X') board[i] = BLACK;
      else if (ch === 'O') board[i] = WHITE;
      else if (ch === '*') target = i;
    }));
    const black = forbiddenReason(board, target, BLACK, 'renju');
    check(black === (verdict ? VERDICT_RE[verdict] : null), `${note}: 흑 렌주룰 결과 ${black}`);
    check(forbiddenReason(board, target, WHITE, 'renju') == null, `${note}: 백은 금수 없음`);
    if (verdict === 'overline') {
      const b2 = board.slice();
      b2[target] = WHITE;
      rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') b2[toIdx(ox + x, oy + y)] = WHITE; }));
      check(winLineAt(b2, target, WHITE, 'renju') != null, `${note}: 백 장목은 승리`);
    }
  }
}

// 섯다 확률 표: 경우의 수 합이 190, 확률 합이 100%
const seotda = RULE_GUIDES.find((g) => g.slug === 'seotda-jokbo');
const odds = seotda.body.find((b) => b.table && b.table.head[1] === '2장 경우의 수').table.rows;
check(odds.reduce((n, r) => n + Number(r[1].split(' / ')[0]), 0) === 190, '섯다 2장 경우의 수 합 190');
for (const col of [2, 3]) {
  const sum = odds.reduce((n, r) => n + parseFloat(r[col]), 0);
  check(Math.abs(sum - 100) < 0.1, `섯다 확률 ${col}열 합 ${sum}`);
}
console.log(odds.map((r) => r.join(' | ')).join('\n'));

console.log(`\n${pass} 통과, ${fail} 실패`);
process.exit(fail ? 1 : 0);
