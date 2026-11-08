// 섯다 규칙 엔진 검증 (규칙: src/pages/play/seotda/RULES.md)
// 실행: node scripts/seotda-test.mjs
// 서버 대조 파일 다시 만들기: node scripts/seotda-test.mjs --fixture ../src/test/resources/seotda
//   pairs.txt: 2인 대결 14,535가지 결과, games.json: 무작위 판 진행 기록 (서버가 같은 결과를 내는지 확인)
import fs from 'node:fs';
import path from 'node:path';
import {
  CARD_COUNT, monthOf, classify, resolve, newHand, applyAction, legalActions, handLabel, pendingSeats,
  nextHandArgs, toHwatuId, handCards,
} from '../src/pages/play/seotda/engine.js';
import { aiAction, equityOf, bestPick, estimateEquity } from '../src/pages/play/seotda/ai.js';
import { CARDS } from '../src/components/hwatu/cards.js';

let failed = 0;
let passed = 0;
const check = (label, cond) => {
  if (cond) passed++;
  else { failed++; console.log(`FAIL ${label}`); }
};
const throws = (fn) => { try { fn(); return false; } catch (e) { return e.message === 'illegal_action'; } };

// 카드 이름: 1A = 1월 첫 장(광·열끗), 1B = 1월 둘째 장
const C = (s) => (Number(s.slice(0, -1)) - 1) * 2 + (s.endsWith('A') ? 0 : 1);
const H = (a, b) => classify(C(a), C(b));
const win = (...hands) => resolve(hands.map((h, i) => ({ seat: i, cards: h.split(' ').map(C) })));

// ── 1. 카드 20장이 RULES.md §1 표와 같은지 (공용 화투 그림의 종류와 대조)
const KIND = { 1: ['gwang', 'tti'], 2: ['yeol', 'tti'], 3: ['gwang', 'tti'], 4: ['yeol', 'tti'], 5: ['yeol', 'tti'], 6: ['yeol', 'tti'], 7: ['yeol', 'tti'], 8: ['gwang', 'yeol'], 9: ['yeol', 'tti'], 10: ['yeol', 'tti'] };
for (let id = 0; id < CARD_COUNT; id++) {
  const hw = CARDS[toHwatuId(id)];
  if (hw.month !== monthOf(id) || hw.kind !== KIND[monthOf(id)][id % 2]) check(`카드 ${id}: 공용 그림 ${hw.month}월 ${hw.kind}`, false);
}
check('카드 20장 = 공용 그림의 광·열끗·띠와 일치, 피 없음', [...Array(CARD_COUNT).keys()].every((id) => CARDS[toHwatuId(id)].kind !== 'pi'));

// ── 2. 190가지 조합 분류 (엔진과 따로 쓴 기준표로 대조)
const ALL = [];
for (let a = 0; a < CARD_COUNT; a++) for (let b = a + 1; b < CARD_COUNT; b++) ALL.push([a, b]);
check('조합 수 190', ALL.length === 190);
const expectBase = (a, b) => {
  const [m1, m2] = [monthOf(a), monthOf(b)].sort((x, y) => x - y);
  const gw = (id) => id % 2 === 0 && [1, 3, 8].includes(monthOf(id));
  if (gw(a) && gw(b)) return m1 === 3 ? 1000 : 900;
  if (m1 === m2) return 700 + m1 * 10;
  const NAMED = [[1, 2, 600], [1, 4, 590], [1, 9, 580], [1, 10, 570], [4, 10, 560], [4, 6, 550]];
  const nm = NAMED.find(([x, y]) => x === m1 && y === m2);
  return nm ? nm[2] : 100 + ((m1 + m2) % 10);
};
const counts = {};
let classOk = true;
ALL.forEach(([a, b]) => {
  const h = classify(a, b);
  const k = h.special || h.code;
  counts[k] = (counts[k] || 0) + 1;
  if (h.base !== expectBase(a, b) || classify(b, a).base !== h.base || !handLabel(h)) classOk = false;
});
check('190가지 모두 기준표와 같은 세기, 순서 무관, 이름 있음', classOk);
const want = { gwang38: 1, gwang13: 1, gwang18: 1, ttaeng: 10, ali: 4, doksa: 4, gubbing: 4, jangbbing: 4, jangsa: 4, seryuk: 4, amhaeng: 1, ttaengjabi: 1, gusa: 3, mgusa: 1, kkut: 147 };
Object.entries(want).forEach(([k, v]) => check(`${k} ${counts[k]}개 (기대 ${v})`, counts[k] === v));
check('특수패 원래 값: 암행어사 1끗, 땡잡이 망통, 구사·멍구사 3끗', H('4A', '7A').kkut === 1 && H('3A', '7A').kkut === 0 && H('4B', '9A').kkut === 3 && H('4A', '9A').kkut === 3);
check('특수패는 그림이 맞아야: 4띠+7열끗은 1끗', H('4B', '7A').special === undefined && H('4B', '7A').kkut === 1);
check('3광+7띠는 망통 (땡잡이 아님)', H('3A', '7B').special === undefined && H('3A', '7B').kkut === 0);
check('1광+3띠는 광땡 아님(4끗)', H('1A', '3B').code === 'kkut' && H('1A', '3B').kkut === 4);
check('18광땡 = 13광땡 세기', H('1A', '8A').base === H('1A', '3A').base);

// ── 3. 족보 순서: 위가 아래를 반드시 이김
const LADDER = [
  ['38광땡', '3A 8A'], ['13광땡', '1A 3A'], ['장땡', '10A 10B'], ['9땡', '9A 9B'], ['5땡', '5A 5B'], ['삥땡', '1A 1B'],
  ['알리', '1B 2A'], ['독사', '1B 4B'], ['구삥', '1B 9B'], ['장삥', '1B 10B'], ['장사', '4B 10A'], ['세륙', '4B 6A'],
  ['갑오', '2B 7B'], ['8끗', '3B 5A'], ['5끗', '2A 3B'], ['1끗', '5B 6B'], ['망통', '2B 8B'],
];
let ladderOk = true;
for (let i = 0; i < LADDER.length; i++) {
  for (let j = i + 1; j < LADDER.length; j++) {
    const [n1, h1] = LADDER[i];
    const [n2, h2] = LADDER[j];
    if (h2.split(' ').some((c) => h1.split(' ').includes(c))) continue;
    const r = win(h1, h2);
    const r2 = win(h2, h1);
    if (r.redo || r.winners.join() !== '0' || r2.winners.join() !== '1') { ladderOk = false; console.log(`  ${n1} > ${n2} 실패`); }
  }
}
check('족보 사다리 17단계 서로 비교 (자리 바꿔도 같음)', ladderOk);

// ── 4. 특수패
const one = (r, seat, label) => check(label, !r.redo && r.winners.length === 1 && r.winners[0] === seat);
one(win('4A 7A', '1A 3A'), 0, '암행어사 > 13광땡');
one(win('4A 7A', '1A 8A'), 0, '암행어사 > 18광땡');
one(win('4A 7A', '3A 8A'), 1, '암행어사 < 38광땡');
one(win('4A 7A', '10A 10B'), 1, '광땡 없으면 암행어사는 1끗 (장땡에 짐)');
one(win('4A 7A', '2A 10B'), 1, '광땡 없으면 암행어사는 1끗 (2끗에 짐)');
check('광땡 없으면 암행어사(1끗)와 1끗은 동점', win('4A 7A', '2B 9B').winners.length === 2);
one(win('4A 7A', '1A 3A', '10A 10B'), 0, '13광땡·장땡과 함께면 암행어사가 이김');
one(win('3A 7A', '9A 9B'), 0, '땡잡이 > 9땡');
one(win('3A 7A', '1A 1B'), 0, '땡잡이 > 삥땡');
one(win('3A 7A', '10A 10B'), 1, '땡잡이 < 장땡');
one(win('3A 7A', '1A 8A'), 1, '땡잡이 < 광땡');
one(win('3A 7A', '2A 6A'), 1, '땡 없으면 땡잡이는 망통 (8끗에 짐)');
one(win('3A 7A', '5A 5B', '10A 10B'), 2, '땡잡이·5땡·장땡 → 장땡');
one(win('3A 7A', '5A 5B', '2A 6A'), 0, '땡잡이·5땡·8끗 → 땡잡이');
check('땡이 없으면 땡잡이와 망통은 동점', win('3A 7A', '2B 8B').winners.length === 2);
const redo = (r, label) => check(label, r.redo === true && r.winners.length === 0);
redo(win('4B 9B', '1B 2A'), '구사 vs 알리 → 재경기');
redo(win('4B 9A', '2B 7B'), '구사 vs 갑오 → 재경기');
redo(win('4B 9B', '1B 2A', '5B 6A'), '구사 vs 알리·1끗 (3명) → 재경기');
one(win('4B 9B', '1A 1B'), 1, '구사 vs 삥땡 → 삥땡 승');
const g3 = win('4B 9B', '1A 1B', '2A 10B');
check('재경기가 안 되면 구사는 3끗 (2끗보다 셈)', !g3.redo && g3.hands[0].strength > g3.hands[2].strength && g3.hands[0].kkut === 3);
redo(win('4A 9A', '7B 9B'), '멍텅구리구사 vs 6끗 → 재경기');
redo(win('4A 9A', '8A 8B'), '멍텅구리구사 vs 8땡 → 재경기');
one(win('4A 9A', '10A 10B'), 1, '멍텅구리구사 vs 장땡 → 장땡 승 (재경기 아님)');
one(win('4A 9A', '1A 3A'), 1, '멍텅구리구사 vs 13광땡 → 광땡 승');
one(win('4B 9B', '1A 3A', '2B 7B'), 1, '광땡이 있으면 구사 재경기 없음');
redo(win('4B 9B', '3A 7A', '1B 2A'), '구사 판단은 땡잡이를 망통으로 봄 (최고 알리 → 재경기)');

// ── 5. 동점
check('5끗 동점', win('2A 3B', '6B 9A').winners.length === 2);
check('같은 알리 동점', win('1A 2A', '1B 2B').winners.length === 2);

// ── 6. 2인 대결표 (서버 기준 파일)
let table = '';
for (let i = 0; i < ALL.length; i++) {
  for (let j = i + 1; j < ALL.length; j++) {
    const [a, b] = ALL[i];
    const [c, d] = ALL[j];
    if (a === c || a === d || b === c || b === d) continue;
    const r = resolve([{ seat: 0, cards: [a, b] }, { seat: 1, cards: [c, d] }]);
    table += r.redo ? 'R' : r.winners.length === 2 ? 'T' : r.winners[0] === 0 ? 'A' : 'B';
  }
}
check(`2인 대결 ${table.length}가지 (기대 14535)`, table.length === 14535);

// ── 7. 2장 섯다 진행
const deck = (...cards) => {
  const d = cards.map(C);
  for (let i = 0; i < CARD_COUNT; i++) if (!d.includes(i)) d.push(i);
  return d;
};
const P = (n, chips = 10000) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: `p${i}`, chips }));
const play = (st, ...moves) => moves.reduce((s, [seat, a]) => applyAction(s, seat, a), st);
const types = (st, seat) => legalActions(st, seat).map((a) => a.type).join();

// 2명, 선 0. 덱: 1구 카드(0, 1), 2구 카드(0, 1)
let st = newHand({ players: P(2), dealer: 0, deck: deck('10A', '1B', '10B', '2A') });
check('2장: 처음엔 1장씩, 학교 100씩', st.players.every((p) => p.cards.length === 1) && st.pot === 200 && st.players[0].chips === 9900);
check('2장: 1구 베팅, 선부터', st.phase === 'bet' && st.round === 1 && st.turn === 0);
check('아무도 안 걸었을 때: 다이·체크·삥·쿼터·하프 (따당 없음)', types(st, 0) === 'die,check,bbing,quarter,half');
check('차례 아니면 행동 없음', legalActions(st, 1).length === 0);
check('차례 아닌 행동 거부', throws(() => applyAction(st, 1, 'check')));
check('낼 돈 없는데 콜 거부', throws(() => applyAction(st, 0, 'call')));
check('없는 행동 거부', throws(() => applyAction(st, 0, 'allin')));
check('베팅 중 공개 선택 거부', throws(() => applyAction(st, 0, { type: 'open', card: 0 })));

let s1 = play(st, [0, 'check'], [1, 'check']);
check('모두 체크 → 2장째 받고 2구', s1.round === 2 && s1.players.every((p) => p.cards.length === 2) && s1.turn === 0);
let s2 = play(s1, [0, 'check'], [1, 'check']);
check('2구도 모두 체크 → 승부: 장땡 승', s2.phase === 'done' && s2.result.type === 'showdown' && s2.result.winners.join() === '0' && s2.players[0].chips === 10100);
check('공개 순서는 선부터', s2.result.reveal.join() === '0,1');

s1 = play(st, [0, 'bbing']);
check('삥 = 학교(100) → 레벨 200', s1.level === 200 && s1.pot === 300 && s1.turn === 1);
check('삥 뒤: 다이·콜·따당·쿼터·하프', types(s1, 1) === 'die,call,ddadang,quarter,half');
const dd = legalActions(s1, 1).find((a) => a.type === 'ddadang');
check('따당 = 콜 금액의 2배 (100 → 200 냄, 레벨 300)', dd.pay === 200);
const qt = legalActions(s1, 1).find((a) => a.type === 'quarter');
check('쿼터 = 콜 100 + (300+100)/4 = 200', qt.pay === 200);
const hf = legalActions(s1, 1).find((a) => a.type === 'half');
check('하프 = 콜 100 + (300+100)/2 = 300', hf.pay === 300);
s2 = play(s1, [1, 'ddadang']);
check('따당 뒤 선은 다시 올릴 수 있음 (올린 사람)', s2.turn === 0 && types(s2, 0).includes('half'));
let s3 = play(s2, [0, 'call']);
check('콜로 1구 끝 → 2구 (선부터, 아직 아무도 안 걸어 체크 가능)', s3.round === 2 && s3.turn === 0 && types(s3, 0) === 'die,check,bbing,quarter,half');
s3 = play(st, [0, 'check'], [1, 'bbing']);
check('체크한 사람은 다시 못 올림: 콜·다이만', types(s3, 0) === 'die,call');
s3 = play(s3, [0, 'call']);
check('체크 → 삥 → 콜 → 2구', s3.round === 2 && s3.pot === 400);

s1 = play(st, [0, 'bbing'], [1, 'die']);
check('다이로 끝 → 남은 사람이 판돈, 패 공개 안 함, 2장째 안 돌림', s1.result.type === 'fold' && s1.result.reveal.length === 0 && s1.players[0].chips === 10100 && s1.players[0].cards.length === 1);

// 맥스: 판 시작 때 가장 적게 가진 사람 기준
st = newHand({ players: [{ id: 'a', name: 'a', chips: 10000 }, { id: 'b', name: 'b', chips: 150 }], dealer: 0, deck: deck('10A', '1B', '10B', '2A') });
s1 = play(st, [0, 'half']);
check('맥스: 하프가 150에서 멈춤', s1.level === 150);
check('맥스에 닿으면 더 못 올림', !legalActions(s1, 1).some((a) => ['half', 'quarter', 'ddadang'].includes(a.type)));
s1 = play(s1, [1, 'call']);
check('맥스 콜 → 2구는 체크·다이만', s1.round === 2 && types(s1, 0) === 'die,check');

// 3명: 선 1, 돌리는 순서 1 → 2 → 0
st = newHand({ players: P(3), dealer: 1, deck: deck('2A', '3B', '1B', '2B', '6B', '4B') });
check('3명 돌리기: 선부터 한 장씩 두 바퀴', st.players[1].cards[0] === C('2A') && st.players[2].cards[0] === C('3B') && st.players[0].cards[0] === C('1B'));
s1 = play(st, [1, 'check'], [2, 'bbing']);
check('삥 뒤 다시 선에게, 체크한 선은 콜·다이만', s1.turn === 0 && types(s1, 1) === '' && s1.level === 200);
s1 = play(s1, [0, 'call'], [1, 'call']);
check('1구 끝 → 2구 첫 차례는 선(1)', s1.round === 2 && s1.turn === 1);
s1 = play(s1, [1, 'check'], [2, 'check'], [0, 'check']);
check('3명 승부: 2땡 > 독사 > 9끗', s1.result.winners.join() === '1' && s1.result.payouts[1] === 600);

// 동점 → 같은 세기끼리 재경기, 판돈 이월
st = newHand({ players: P(3), dealer: 0, deck: deck('2A', '6A', '1A', '3B', '9A', '4B') });
// 0: 2A 3B(5끗), 1: 6A 9A(5끗), 2: 1A 4B(독사) → 2가 다이하면 5끗 동점
s1 = play(st, [0, 'check'], [1, 'check'], [2, 'bbing'], [0, 'call'], [1, 'call'], [0, 'check'], [1, 'check'], [2, 'die']);
check('동점 → 재경기(tie), 동점자 0·1만, 판돈 600 이월', s1.result.type === 'redo' && s1.result.reason === 'tie' && s1.result.participants.join() === '0,1' && s1.result.carry === 600);
let r1 = newHand({ ...nextHandArgs(s1) });
check('재경기 판: 학교 없음, 판돈 600, 다이한 사람은 빠짐', r1.pot === 600 && r1.players[2].inHand === false && r1.players[0].chips === 9800 && r1.players[0].contrib === 0);
check('재경기 판: 2장 방식(1장 → 베팅)', r1.playMode === 'two' && r1.players[0].cards.length === 1 && r1.players[2].cards.length === 0);
check('재경기 판 선은 그대로(0)', r1.dealer === 0 && r1.turn === 0);

// 구사 재경기: 남은 사람 모두
st = newHand({ players: P(3), dealer: 0, deck: deck('4B', '1B', '5A', '9B', '2A', '6B') });
// 0: 4B 9B 구사, 1: 1B 2A 알리, 2: 5A 6B 1끗
s1 = play(st, [0, 'check'], [1, 'check'], [2, 'check'], [0, 'check'], [1, 'check'], [2, 'check']);
check('구사 → 재경기(gusa), 남은 3명 모두, 선 유지', s1.result.type === 'redo' && s1.result.reason === 'gusa' && s1.result.participants.length === 3 && s1.result.nextDealer === 0 && s1.result.carry === 300);
// 선이 다이한 뒤 재경기: 선 다음 참가자가 선
st = newHand({ players: P(3), dealer: 0, deck: deck('3B', '4B', '1B', '9B', '2A') }); // 0이 1구에서 다이하면 2구 카드는 1·2에게만
// 0: 3B (다이), 1: 4B 9B 구사, 2: 1B 2A 알리
s1 = play(st, [0, 'die'], [1, 'check'], [2, 'check'], [1, 'check'], [2, 'check']);
r1 = newHand(nextHandArgs(s1));
check('선이 빠진 재경기는 선 다음 자리(1)가 선', s1.result.type === 'redo' && r1.dealer === 1 && r1.turn === 1 && !r1.players[0].inHand);

// 재경기에서 포인트 0인 사람: 체크·콜만
r1 = newHand({ players: [{ id: 'a', name: 'a', chips: 0 }, { id: 'b', name: 'b', chips: 5000 }], dealer: 0, redo: { participants: [0, 1], carry: 1000 } });
check('포인트 0 재경기: 올리기 없음', types(r1, 0) === 'die,check');

// ── 8. 3장 섯다
// 선 0, 2명. 첫 바퀴(0,1), 둘째 바퀴(0,1), 3장째(0,1)
st = newHand({ players: P(2), dealer: 0, mode: 'three', deck: deck('3A', '5B', '7B', '6A', '8A', '6B') });
check('3장: 2장씩 받고 공개할 패 고르기', st.phase === 'open' && st.players.every((p) => p.cards.length === 2) && pendingSeats(st).join() === '0,1');
check('3장: 공개 단계엔 베팅 없음', legalActions(st, 0).length === 0 && throws(() => applyAction(st, 0, 'check')));
check('잘못된 공개 번호 거부', throws(() => applyAction(st, 0, { type: 'open', card: 2 })));
s1 = applyAction(st, 1, { type: 'open', card: 0 });
check('한 사람만 고르면 대기', s1.phase === 'open' && pendingSeats(s1).join() === '0');
check('두 번 고르기 거부', throws(() => applyAction(s1, 1, { type: 'open', card: 1 })));
s1 = applyAction(s1, 0, { type: 'open', card: 1 });
check('모두 공개 → 1구 베팅 (선부터)', s1.phase === 'bet' && s1.round === 1 && s1.turn === 0 && s1.players[0].open === 1);
s1 = play(s1, [0, 'bbing'], [1, 'call']);
check('1구 끝 → 3장째', s1.round === 2 && s1.players.every((p) => p.cards.length === 3));
s1 = play(s1, [0, 'check'], [1, 'check']);
check('2구 끝 → 패 고르기', s1.phase === 'select' && pendingSeats(s1).join() === '0,1');
check('같은 카드 두 번 거부', throws(() => applyAction(s1, 0, { type: 'select', pick: [1, 1] })));
check('3장 밖 번호 거부', throws(() => applyAction(s1, 0, { type: 'select', pick: [0, 3] })));
s2 = play(s1, [0, { type: 'select', pick: [0, 2] }], [1, { type: 'select', pick: [1, 2] }]);
// 0: 3A 7B 8A → 3A 8A 38광땡 / 1: 5B 6A 6B → 6땡
check('고른 2장으로 승부: 38광땡 > 6땡', s2.result.type === 'showdown' && s2.result.winners.join() === '0' && handCards(s2.players[0], 'three').join() === [C('3A'), C('8A')].join());
s2 = play(s1, [0, { type: 'select', pick: [0, 1] }], [1, { type: 'select', pick: [1, 2] }]);
check('나쁜 2장을 고르면 그대로 (3A 7B 망통 < 6땡)', s2.result.winners.join() === '1');
check('bestPick: 3A 7B 8A → 3광·8광', bestPick([C('3A'), C('7B'), C('8A')]).join() === '0,2');
check('bestPick: 4A 7A 1A → 독사(4·1)', bestPick([C('4A'), C('7A'), C('1A')]).join() === '0,2');
s1 = play(newHand({ players: P(2), dealer: 0, mode: 'three', deck: deck('3A', '5B', '7B', '6A', '8A', '6B') }), [0, { type: 'open', card: 0 }], [1, { type: 'open', card: 0 }], [0, 'bbing'], [1, 'die']);
check('3장: 1구에서 다이로 끝나면 3장째 없음', s1.result.type === 'fold' && s1.players[0].cards.length === 2);
// 3장 재경기는 2장 방식
st = newHand({ players: P(2), dealer: 0, mode: 'three', deck: deck('2A', '6B', '3B', '9A', '7B', '5A') });
s1 = play(st, [0, { type: 'open', card: 0 }], [1, { type: 'open', card: 0 }], [0, 'check'], [1, 'check'], [0, 'check'], [1, 'check'],
  [0, { type: 'select', pick: [0, 1] }], [1, { type: 'select', pick: [0, 1] }]);
// 0: 2A 3B 5끗 / 1: 6B 9A 5끗 → 동점
check('3장 동점 → 재경기', s1.result.type === 'redo' && s1.result.reason === 'tie');
r1 = newHand(nextHandArgs(s1));
check('3장 재경기는 2장 방식', r1.mode === 'three' && r1.playMode === 'two' && r1.phase === 'bet');

// ── 9. AI 자동 대전: 합법 행동만, 판이 끝나고 포인트 총합 유지 (재경기 포함)
let seed = 7;
const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
let aiOk = true;
let redoCount = 0;
let threeCount = 0;
for (let g = 0; g < 400; g++) {
  const n = 2 + (g % 3);
  const mode = g % 2 ? 'three' : 'two';
  const lv = ['easy', 'normal', 'hard'][g % 3];
  let args = { players: P(n), dealer: g % n, mode };
  for (let h = 0; h < 4; h++) {
    let s = newHand({ ...args, deck: undefined });
    let guard = 0;
    while (s.phase !== 'done' && guard++ < 80) {
      const seats = s.phase === 'bet' ? [s.turn] : pendingSeats(s);
      for (const seat of seats) {
        const a = aiAction(s, seat, lv, rng);
        try { s = applyAction(s, seat, a); } catch { aiOk = false; }
      }
    }
    if (s.phase !== 'done') { aiOk = false; break; }
    if (s.result.type === 'redo') redoCount++;
    if (s.playMode === 'three') threeCount++;
    const total = s.players.reduce((sum, p) => sum + p.chips, 0) + (s.result.carry || 0);
    if (total !== n * 10000) aiOk = false;
    if (s.result.type !== 'redo') break;
    args = nextHandArgs(s);
  }
}
check(`AI 자동 대전 400경기: 합법 행동만, 포인트 총합 유지 (재경기 ${redoCount}번, 3장 판 ${threeCount}번)`, aiOk && redoCount > 0 && threeCount > 0);
check('AI 승률: 38광땡 1, 장땡 > 망통', equityOf(C('3A'), C('8A')) === 1 && equityOf(C('10A'), C('10B')) > equityOf(C('2B'), C('8B')));
// AI 는 남이 숨긴 패를 보지 않음: 숨긴 패만 바꿔도 같은 난수에서 같은 추정
const base = newHand({ players: P(2), dealer: 0, deck: deck('9A', '1A', '9B', '3A') });
const swapped = newHand({ players: P(2), dealer: 0, deck: deck('9A', '2B', '9B', '5B') });
seed = 11; const e1 = estimateEquity(base, 0, 300, rng);
seed = 11; const e2 = estimateEquity(swapped, 0, 300, rng);
check('AI 추정은 상대 숨긴 패와 무관', e1 === e2);

// ── 10. 서버 대조용 무작위 판 기록 (행동은 엔진의 합법 행동 중 무작위)
const games = [];
seed = 2026;
for (let g = 0; g < 300; g++) {
  const n = 2 + (g % 3);
  const mode = g % 2 ? 'three' : 'two';
  const chips = Array.from({ length: n }, () => 100 + Math.floor(rng() * 50) * 100);
  const d = Array.from({ length: CARD_COUNT }, (_, i) => i);
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  const dealer = Math.floor(rng() * n);
  const redoArg = g % 7 === 3 ? { participants: [...Array(n).keys()].filter((i) => i !== n - 1 || n === 2), carry: 500 } : null;
  let s = newHand({ players: chips.map((c, i) => ({ id: i, name: `p${i}`, chips: c })), dealer, mode, deck: d, redo: redoArg });
  const steps = [];
  while (s.phase !== 'done') {
    if (s.phase === 'bet') {
      const acts = legalActions(s, s.turn);
      const a = acts[Math.floor(rng() * acts.length)];
      steps.push({ seat: s.turn, type: a.type, legal: acts.map((x) => `${x.type}:${x.pay}`).join(',') });
      s = applyAction(s, s.turn, a.type);
    } else {
      const seat = pendingSeats(s)[0];
      const act = s.phase === 'open' ? { type: 'open', card: Math.floor(rng() * 2) } : { type: 'select', pick: [[0, 1], [0, 2], [1, 2]][Math.floor(rng() * 3)] };
      steps.push({ seat, ...act });
      s = applyAction(s, seat, act);
    }
  }
  games.push({
    mode, dealer, chips, deck: d, redo: redoArg, steps,
    expect: { type: s.result.type, reason: s.result.reason, winners: s.result.winners, participants: s.result.participants, chips: s.players.map((p) => p.chips), pot: s.pot, nextDealer: s.result.nextDealer, carry: s.result.carry },
  });
}
check('서버 대조용 무작위 판 300개 생성', games.length === 300);

const fixtureArg = process.argv.indexOf('--fixture');
if (fixtureArg > 0) {
  const dir = process.argv[fixtureArg + 1];
  fs.writeFileSync(path.join(dir, 'pairs.txt'), `${table}\n`);
  fs.writeFileSync(path.join(dir, 'games.json'), `${JSON.stringify(games)}\n`);
  console.log(`기준 파일 작성: ${dir}/pairs.txt, games.json`);
}

console.log(`\n${passed}개 통과, ${failed}개 실패`);
if (failed) process.exit(1);
