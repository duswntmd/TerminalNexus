// 섯다 규칙 엔진 검증: 190가지 족보 분류, 서로 비교, 특수패, 동점, 베팅 진행
// 실행: node scripts/seotda-test.mjs
// 서버 판정과 맞추는 기준 파일 다시 만들기: node scripts/seotda-test.mjs --fixture ../src/test/resources/seotda/pairs.txt
import fs from 'node:fs';
import { CARD_COUNT, monthOf, classify, resolve, newHand, applyAction, legalActions, handLabel } from '../src/pages/play/seotda/engine.js';
import { decide, equityOf } from '../src/pages/play/seotda/ai.js';

let failed = 0;
let passed = 0;
const check = (label, cond) => {
  if (cond) passed++;
  else { failed++; console.log(`FAIL ${label}`); }
};

// 카드 이름: 1A = 1월 광(첫 장), 1B = 1월 둘째 장
const C = (s) => (Number(s.slice(0, -1)) - 1) * 2 + (s.endsWith('A') ? 0 : 1);
const H = (a, b) => classify(C(a), C(b));
const win = (...hands) => resolve(hands.map((h, i) => ({ seat: i, cards: h.split(' ').map(C) })));

// 1. 190가지 조합 분류: 엔진과 따로 쓴 기준표로 대조
const ALL = [];
for (let a = 0; a < CARD_COUNT; a++) for (let b = a + 1; b < CARD_COUNT; b++) ALL.push([a, b]);
check('조합 수 190', ALL.length === 190);

const expectBase = (a, b) => {
  const [m1, m2] = [monthOf(a), monthOf(b)].sort((x, y) => x - y);
  const gw = (id) => id % 2 === 0 && [1, 3, 8].includes(monthOf(id));
  if (gw(a) && gw(b)) return m1 === 3 ? 1000 : 900; // 3·8 / 1·3, 1·8
  if (m1 === m2) return 700 + m1 * 10;
  const NAMED = [[1, 2, 600], [1, 4, 590], [1, 9, 580], [1, 10, 570], [4, 10, 560], [4, 6, 550]];
  const n = NAMED.find(([x, y]) => x === m1 && y === m2);
  return n ? n[2] : 100 + ((m1 + m2) % 10);
};
const counts = {};
ALL.forEach(([a, b]) => {
  const h = classify(a, b);
  const k = h.special || h.code;
  counts[k] = (counts[k] || 0) + 1;
  if (h.base !== expectBase(a, b)) check(`분류 ${a},${b}: ${h.base} (기대 ${expectBase(a, b)})`, false);
  if (classify(b, a).base !== h.base) check(`순서 무관 ${a},${b}`, false);
  if (!handLabel(h)) check(`이름 ${a},${b}`, false);
});
passed++;
const want = { gwang38: 1, gwang13: 1, gwang18: 1, ttaeng: 10, ali: 4, doksa: 4, gubbing: 4, jangbbing: 4, jangsa: 4, seryuk: 4, amhaeng: 1, ttaengjabi: 1, gusa: 3, mgusa: 1, kkut: 147 };
Object.entries(want).forEach(([k, v]) => check(`${k} 개수 ${counts[k]} (기대 ${v})`, counts[k] === v));
check('개수 합 190', Object.values(counts).reduce((s, v) => s + v, 0) === 190);
check('특수패 원래 값: 암행어사 1끗, 땡잡이 망통, 구사 3끗', H('4A', '7A').kkut === 1 && H('3A', '7A').kkut === 0 && H('4B', '9A').kkut === 3 && H('4A', '9A').kkut === 3);
check('1광+3띠는 광땡 아님(4끗)', H('1A', '3B').code === 'kkut' && H('1A', '3B').kkut === 4);
check('8월 두 장은 8땡', H('8A', '8B').code === 'ttaeng' && H('8A', '8B').month === 8);

// 2. 족보 순서: 위에서 아래로 반드시 이겨야 함 (특수패 없는 대표 패)
const LADDER = [
  ['38광땡', '3A 8A'], ['13광땡', '1A 3A'], ['장땡', '10A 10B'], ['9땡', '9A 9B'], ['5땡', '5A 5B'], ['삥땡', '1A 1B'],
  ['알리', '1B 2A'], ['독사', '1B 4B'], ['구삥', '1B 9B'], ['장삥', '1B 10B'], ['장사', '4B 10A'], ['세륙', '4B 6A'],
  ['갑오', '2B 7B'], ['8끗', '3B 5A'], ['5끗', '2A 3B'], ['1끗', '5B 6B'], ['망통', '2B 8B'],
];
for (let i = 0; i < LADDER.length; i++) {
  for (let j = i + 1; j < LADDER.length; j++) {
    const [n1, h1] = LADDER[i];
    const [n2, h2] = LADDER[j];
    const s1 = new Set(h1.split(' '));
    if (h2.split(' ').some((c) => s1.has(c))) continue;
    const r = win(h1, h2);
    check(`${n1} > ${n2}`, !r.redo && r.winners.length === 1 && r.winners[0] === 0);
    const r2 = win(h2, h1);
    check(`${n2} < ${n1} (자리 바꿈)`, !r2.redo && r2.winners[0] === 1);
  }
}

// 3. 특수패
const one = (r, seat, label) => check(label, !r.redo && r.winners.length === 1 && r.winners[0] === seat);
one(win('4A 7A', '1A 3A'), 0, '암행어사가 13광땡을 잡음');
one(win('4A 7A', '1A 8A'), 0, '암행어사가 18광땡을 잡음');
one(win('4A 7A', '3A 8A'), 1, '암행어사는 38광땡을 못 잡음');
one(win('4A 7A', '10A 10B'), 1, '광땡이 없으면 암행어사는 1끗 (장땡에 짐)');
one(win('4A 7A', '2A 10B'), 1, '광땡이 없으면 암행어사는 1끗 (2끗에 짐)');
one(win('4A 7A', '1A 3A', '10A 10B'), 0, '13광땡·장땡과 함께면 암행어사가 이김');
one(win('3A 7A', '9A 9B'), 0, '땡잡이가 9땡을 잡음');
one(win('3A 7A', '1A 1B'), 0, '땡잡이가 삥땡을 잡음');
one(win('3A 7A', '10A 10B'), 1, '땡잡이는 장땡을 못 잡음');
one(win('3A 7A', '1A 8A'), 1, '땡잡이는 광땡을 못 잡음');
one(win('3A 7A', '2A 6A'), 1, '땡이 없으면 땡잡이는 망통 (8끗에 짐)');
one(win('3A 7A', '5A 5B', '10A 10B'), 2, '땡잡이·5땡·장땡이면 장땡');
one(win('3A 7A', '5A 5B', '2A 6A'), 0, '땡잡이·5땡·8끗이면 땡잡이');
check('땡잡이와 망통은 동점', win('3A 7A', '2B 8B').winners.length === 2);

const redo = (r, label) => check(label, r.redo === true && r.winners.length === 0);
redo(win('4B 9B', '1B 2A'), '구사 vs 알리 → 재경기');
redo(win('4B 9A', '2B 7B'), '구사 vs 갑오 → 재경기');
redo(win('4B 9B', '1B 2A', '5B 6A'), '구사 vs 알리·1끗 (3명) → 재경기');
one(win('4B 9B', '1A 1B'), 1, '구사 vs 삥땡 → 삥땡 승 (재경기 아님)');
redo(win('4A 9A', '7B 9B'), '멍텅구리구사 vs 6끗 → 재경기');
redo(win('4A 9A', '8A 8B'), '멍텅구리구사 vs 8땡 → 재경기');
one(win('4A 9A', '10A 10B'), 1, '멍텅구리구사 vs 장땡 → 장땡 승');
one(win('4A 9A', '1A 3A'), 1, '멍텅구리구사 vs 13광땡 → 광땡 승');
one(win('4B 9B', '1A 3A', '2B 7B'), 1, '광땡이 있으면 구사 재경기 없음');
redo(win('4B 9B', '2B 5A'), '구사 vs 7끗 → 재경기');
const g3 = win('4B 9B', '1A 1B', '2A 10B');
check('재경기가 안 되면 구사는 3끗 (2끗보다 셈, 삥땡 승)', !g3.redo && g3.winners[0] === 1 && g3.hands[0].strength > g3.hands[2].strength && g3.hands[0].kkut === 3);

// 4. 동점
check('13광땡과 18광땡은 같은 세기 (1광을 함께 쓸 수 없어 실제로 만나지 않음)', H('1A', '3A').base === H('1A', '8A').base);
const tie = win('1A 3A', '1B 8A');
check('13광땡 vs 1띠+8광(9끗)은 광땡 승', tie.winners.length === 1 && tie.winners[0] === 0);
check('5끗 동점', win('2A 3B', '6B 9A').winners.length === 2);
check('같은 이름 알리 동점', win('1A 2A', '1B 2B').winners.length === 2);

// 5. 전체 2인 대결표 (서버 테스트 기준 파일). A: 앞 패 승, B: 뒤 패 승, T: 동점, R: 재경기
let table = '';
for (let i = 0; i < ALL.length; i++) {
  for (let j = i + 1; j < ALL.length; j++) {
    const [a, b] = ALL[i];
    const [c, d] = ALL[j];
    if (a === c || a === d || b === c || b === d) continue;
    const r = resolve([{ seat: 0, cards: [a, b] }, { seat: 1, cards: [c, d] }]);
    const rr = resolve([{ seat: 1, cards: [c, d] }, { seat: 0, cards: [a, b] }]);
    const code = r.redo ? 'R' : r.winners.length === 2 ? 'T' : r.winners[0] === 0 ? 'A' : 'B';
    const code2 = rr.redo ? 'R' : rr.winners.length === 2 ? 'T' : rr.winners[0] === 0 ? 'A' : 'B';
    if (code !== code2) check(`자리 순서에 따라 결과가 달라짐 ${a},${b} vs ${c},${d}`, false);
    table += code;
  }
}
check(`2인 대결 수 ${table.length} (기대 14535)`, table.length === 14535);
const fixtureArg = process.argv.indexOf('--fixture');
if (fixtureArg > 0) {
  fs.writeFileSync(process.argv[fixtureArg + 1], `${table}\n`);
  console.log(`기준 파일 작성: ${process.argv[fixtureArg + 1]}`);
}

// 6. 베팅 진행
const deck = (...cards) => {
  const d = cards.map(C);
  for (let i = 0; i < CARD_COUNT; i++) if (!d.includes(i)) d.push(i);
  return d;
};
const P = (n, chips = 10000) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `p${i}`, chips }));
const play = (st, ...moves) => moves.reduce((s, [seat, type]) => applyAction(s, seat, type), st);

// 2명, 덱 순서: 선(0) 첫 장, 1 첫 장, 선 둘째 장, 1 둘째 장
let st = newHand({ players: P(2), dealer: 0, ante: 100, deck: deck('10A', '1B', '10B', '2A') });
check('패 돌리기: 0번 장땡', classify(...st.players[0].cards).code === 'ttaeng' && st.players[0].cards.includes(C('10A')));
check('기본 판돈', st.pot === 200 && st.players[0].chips === 9900);
check('첫 행동: 다이·체크·삥·하프', legalActions(st, 0).map((a) => a.type).join() === 'die,check,bbing,half');
check('차례가 아니면 행동 없음', legalActions(st, 1).length === 0);
let threw = false;
try { applyAction(st, 1, 'call'); } catch (e) { threw = e.message === 'illegal_action'; }
check('차례 아닌 행동 거부', threw);
threw = false;
try { applyAction(st, 0, 'call'); } catch (e) { threw = e.message === 'illegal_action'; }
check('낼 돈이 없는데 콜 거부', threw);

let s1 = play(st, [0, 'check'], [1, 'check']);
check('모두 체크 → 승부, 장땡 승', s1.phase === 'done' && s1.result.type === 'showdown' && s1.result.winners[0] === 0 && s1.players[0].chips === 10100 && s1.players[1].chips === 9900);

s1 = play(st, [0, 'half']);
check('하프: (200)/2=100 올림 → 200', s1.level === 200 && s1.pot === 300 && s1.turn === 1);
check('하프 후 상대: 다이·콜·하프 (삥 불가)', legalActions(s1, 1).map((a) => a.type).join() === 'die,call,half');
let s2 = play(s1, [1, 'half']);
check('맞하프: 콜 100 + (300+100)/2=200 → 400', s2.level === 400 && s2.turn === 0);
check('두 번 올리기 불가', !legalActions(s2, 0).some((a) => a.type === 'half' || a.type === 'bbing'));
s2 = play(s2, [0, 'call']);
check('콜로 끝 → 승부 (판돈 800)', s2.phase === 'done' && s2.result.payouts[0] === 800 && s2.players[0].chips === 10400);

s1 = play(st, [0, 'bbing'], [1, 'die']);
check('다이로 끝 → 남은 사람이 판돈, 패 공개 안 함', s1.result.type === 'fold' && s1.result.winners[0] === 0 && s1.result.reveal.length === 0 && s1.players[0].chips === 10100);

// 베팅 한도: 가장 적게 가진 사람 기준
st = newHand({ players: [{ id: 'a', name: 'a', chips: 10000 }, { id: 'b', name: 'b', chips: 150 }], dealer: 0, ante: 100, deck: deck('10A', '1B', '10B', '2A') });
s1 = play(st, [0, 'half']);
check('한도: 하프가 150에서 멈춤', s1.level === 150);
check('한도에 닿으면 더 못 올림', !legalActions(s1, 1).some((a) => a.type === 'half'));
s1 = play(s1, [1, 'call']);
check('한도 콜 후 칩 0', s1.players[1].chips === 0 && s1.result.winners[0] === 0);

// 3명: 올리면 다시 돌아옴, 동점 분배
st = newHand({ players: P(3), dealer: 1, ante: 100, deck: deck('2A', '3B', '1B', '2B', '6B', '4B') });
// 선(1): 2A 2B? 순서: 1번 첫장 2A, 2번 3B, 0번 1B, 1번 둘째 2B, 2번 6B, 0번 4B
check('3명 돌리기', st.players[1].cards.join() === [C('2A'), C('2B')].join() && st.players[0].cards.join() === [C('1B'), C('4B')].join());
check('3명 첫 차례 = 선', st.turn === 1);
s1 = play(st, [1, 'check'], [2, 'bbing']);
check('삥 후 선에게 다시 돌아옴', s1.turn === 0 && s1.level === 200);
s1 = play(s1, [0, 'call'], [1, 'call']);
check('3명 승부: 2땡 승 (2땡 > 독사 > 9끗)', s1.phase === 'done' && s1.result.winners.join() === '1' && s1.result.payouts[1] === 600);

// 동점 분배: 나머지는 선에 가까운 사람
st = newHand({ players: P(3), dealer: 0, ante: 110, deck: deck('2A', '6A', '1A', '3B', '9A', '4B') });
// 0: 2A 3B(5끗), 1: 6A 9A(5끗), 2: 1A 4B(독사)
s1 = play(st, [0, 'check'], [1, 'check'], [2, 'die']);
check('동점 2명 분배 330 → 165씩', s1.result.winners.length === 2 && s1.result.payouts[0] === 165 && s1.result.payouts[1] === 165);
st = newHand({ players: P(2), dealer: 1, ante: 105, deck: deck('2A', '6A', '3B', '9A') });
s1 = play(st, [1, 'check'], [0, 'check']);
check('홀수 판돈 210 동점 → 105씩', s1.result.payouts[0] === 105 && s1.result.payouts[1] === 105);

// 재경기: 판돈 이월, 선 유지
st = newHand({ players: P(2), dealer: 0, ante: 100, deck: deck('4B', '1B', '9B', '2A') });
s1 = play(st, [0, 'check'], [1, 'check']);
check('구사 재경기 → 판돈 이월, 칩 변화 없음(기본 판돈은 판에 남음)', s1.result.type === 'redo' && s1.result.carry === 200 && s1.result.nextDealer === 0 && s1.players[0].chips === 9900);
const s3 = newHand({ players: s1.players.map((p) => ({ ...p })), dealer: 0, ante: 100, carry: s1.result.carry });
check('다음 판 판돈 = 이월 200 + 기본 200', s3.pot === 400);

// 7. AI: 모든 패에 승률, 항상 할 수 있는 행동을 고름
check('승률: 38광땡 > 장땡 > 망통', equityOf(C('3A'), C('8A')) > equityOf(C('10A'), C('10B')) && equityOf(C('10A'), C('10B')) > equityOf(C('2B'), C('8B')));
check('38광땡 승률 1', equityOf(C('3A'), C('8A')) === 1);
let aiOk = true;
let rngSeed = 7;
const rng = () => { rngSeed = (rngSeed * 16807) % 2147483647; return rngSeed / 2147483647; };
for (let g = 0; g < 600; g++) {
  const n = 2 + (g % 3);
  let s = newHand({ players: P(n), dealer: g % n, ante: 100, deck: undefined });
  let guard = 0;
  while (s.phase === 'betting' && guard++ < 50) {
    const lv = ['easy', 'normal', 'hard'][g % 3];
    const a = decide(s, s.turn, lv, rng);
    if (!legalActions(s, s.turn).some((x) => x.type === a)) { aiOk = false; break; }
    s = applyAction(s, s.turn, a);
  }
  const total = s.players.reduce((sum, p) => sum + p.chips, 0) + (s.result?.carry || 0);
  if (s.phase !== 'done' || total !== n * 10000) aiOk = false;
}
check('AI 600판: 합법 행동만, 판이 끝나고 포인트 총합 유지', aiOk);

console.log(`\n${passed}개 통과, ${failed}개 실패`);
if (failed) process.exit(1);
