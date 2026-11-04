// 고스톱 엔진 단위 시험: node src/pages/play/gostop/test/engine.test.mjs
import assert from 'node:assert/strict';
import { newGame, applyAction, scoreOf, settle, legalActions, allCards } from '../engine.js';

const range = (n) => Array.from({ length: n }, (_, i) => i);
let passed = 0;
const test = (name, fn) => {
  try { fn(); passed += 1; } catch (e) { console.error(`✗ ${name}`); throw e; }
};

// 시험용 상태: 필요한 부분만 지정하고 나머지 카드는 신경 쓰지 않는다
const mk = (o = {}) => ({
  ...newGame({ deck: range(48) }),
  hands: [[], []], floor: [], deck: [], captured: [[], []],
  turn: 0, phase: 'play', result: null, events: [],
  ...o,
});
const PI10 = [2, 3, 6, 7, 10, 11, 14, 15, 18, 19]; // 일반 피 10장
const types = (s) => s.events.map((e) => e.type);

/* ── 족보 ── */
test('3광 / 비광 포함 3광 / 4광 / 5광', () => {
  assert.equal(scoreOf([0, 8, 28]).gwang, 3);
  assert.equal(scoreOf([0, 8, 44]).gwang, 2);
  assert.equal(scoreOf([0, 8, 28, 44]).gwang, 4);
  assert.equal(scoreOf([0, 8, 28, 40, 44]).gwang, 15);
  assert.equal(scoreOf([0, 8]).gwang, 0);
});
test('홍단·청단·초단·띠 5장', () => {
  assert.equal(scoreOf([1, 5, 9]).total, 3);
  assert.equal(scoreOf([21, 33, 37]).total, 3);
  assert.equal(scoreOf([13, 17, 25]).total, 3);
  assert.equal(scoreOf([1, 5, 13, 21, 46]).total, 1); // 단 없이 띠 5장
  assert.equal(scoreOf([1, 5, 9, 13, 21, 46]).total, 3 + 2); // 홍단 + 띠 6장
  assert.equal(scoreOf([46, 1, 5]).total, 0); // 비띠는 홍단이 아님
});
test('고도리·열끗 5장', () => {
  assert.equal(scoreOf([4, 12, 29]).total, 5);
  assert.equal(scoreOf([4, 12, 29, 16, 20]).total, 5 + 1);
  assert.equal(scoreOf([4, 12, 45]).total, 0); // 비 열끗은 고도리가 아님
});
test('피 10장, 쌍피', () => {
  assert.equal(scoreOf(PI10).total, 1);
  assert.equal(scoreOf(PI10.slice(0, 9)).total, 0);
  assert.equal(scoreOf([41, 47, 2, 3, 6, 7, 10, 11]).counts.pi, 10);
  assert.equal(scoreOf([41, 47, 2, 3, 6, 7, 10, 11, 14]).total, 2);
});
test('국진 선택 (자동/열끗/쌍피)', () => {
  const cap = [32, 2, 3, 6, 7, 10, 11, 14, 15]; // 피 8장 + 국진
  assert.equal(scoreOf(cap, 'yeol').total, 0);
  assert.equal(scoreOf(cap, 'pi').total, 1);
  assert.equal(scoreOf(cap).total, 1);
  assert.equal(scoreOf(cap).gukjin, 'pi');
  const cap2 = [32, 4, 12, 16, 20]; // 열끗 5장(국진 포함)
  assert.equal(scoreOf(cap2).total, 1);
  assert.equal(scoreOf(cap2).gukjin, 'yeol');
  assert.equal(scoreOf(cap2, 'pi').counts.yeol, 4);
});

/* ── 정산 ── */
const ended = (o) => mk({ phase: 'end', result: { winner: 0, reason: 'stop' }, ...o });
test('피박 (패자 피 7장 이하)', () => {
  const win = [...PI10, 41, 47, 22]; // 피 15장 → 6점, 위로 1장 더해 7점
  let st = settle(ended({ captured: [win, [26, 27, 30, 31, 34, 35, 38]] }));
  assert.ok(st.multipliers.some(([k]) => k === 'pibak'));
  st = settle(ended({ captured: [win, [26, 27, 30, 31, 34, 35, 38, 39]] }));
  assert.ok(!st.multipliers.some(([k]) => k === 'pibak'));
});
test('광박 / 멍박', () => {
  const st = settle(ended({ captured: [[0, 8, 28, 4, 12, 29, 16, 20], [2]] }));
  const keys = st.multipliers.map(([k]) => k);
  assert.ok(keys.includes('gwangbak'));
  assert.ok(keys.includes('meongbak'));
  assert.equal(st.base, 3 + 6);
  assert.equal(st.final, 9 * 4);
  const st2 = settle(ended({ captured: [[0, 8, 28, 4, 12, 29, 16, 20], [40, 24]] }));
  assert.equal(st2.multipliers.length, 0);
});
test('패자 국진은 박을 피하는 쪽으로', () => {
  // 승자 열끗 점수, 패자는 국진만 열끗 → 열끗으로 세면 멍박 면제
  const st = settle(ended({ captured: [[4, 12, 29, 16, 20, 1, 5, 9], [32, ...PI10.slice(0, 7)]] }));
  const keys = st.multipliers.map(([k]) => k);
  assert.ok(!keys.includes('meongbak'));
});
test('고 횟수 가산과 배수, 고박, 흔들기, 나가리 배수', () => {
  const cap = [[1, 5, 9, 13, 17, 25], [0, 2, 3, 4, 6, 7, 10, 11, 14, 15]]; // 홍단 3 + 초단 3 + 띠 6장 2 = 8점
  assert.equal(settle(ended({ captured: cap })).final, 8);
  assert.equal(settle(ended({ captured: cap, goCount: [1, 0] })).final, 9);
  assert.equal(settle(ended({ captured: cap, goCount: [2, 0] })).final, 10);
  assert.equal(settle(ended({ captured: cap, goCount: [3, 0] })).final, 11 * 2);
  assert.equal(settle(ended({ captured: cap, goCount: [4, 0] })).final, 12 * 4);
  assert.equal(settle(ended({ captured: cap, goCount: [0, 1] })).final, 8 * 2); // 고박
  assert.equal(settle(ended({ captured: cap, shakes: [1, 0] })).final, 8 * 2);
  assert.equal(settle(ended({ captured: cap, shakes: [2, 0] })).final, 8 * 4);
  assert.equal(settle(ended({ captured: cap, carry: 2 })).final, 8 * 2);
  assert.equal(settle(ended({ captured: cap, goCount: [3, 1], shakes: [1, 0] })).final, 11 * 2 * 2 * 2);
});

/* ── 진행 ── */
test('일반 짝 맞추기와 뒤집기', () => {
  const s = applyAction(mk({ hands: [[2, 40], [44]], floor: [3, 6], deck: [45, 7] }), { type: 'play', card: 2 });
  assert.deepEqual(s.captured[0].sort((a, b) => a - b), [2, 3, 6, 7]);
  assert.equal(s.turn, 1);
});
test('뻑: 세 장이 바닥에 남고 뻑 주인을 기록', () => {
  const s = applyAction(mk({ hands: [[3, 40], [44]], floor: [2], deck: [45, 0] }), { type: 'play', card: 3 });
  assert.ok(types(s).includes('ppeok'));
  assert.deepEqual(s.floor.sort((a, b) => a - b), [0, 2, 3]);
  assert.equal(s.captured[0].length, 0);
  assert.equal(s.ppeokOwner[1], 0);
});
test('뻑 먹기(1장)와 자뻑(2장)', () => {
  const base = { hands: [[1, 40], [44]], floor: [0, 2, 3], deck: [45, 46], captured: [[], [6, 7, 10]] };
  let s = applyAction(mk({ ...base, ppeokOwner: { 1: 1 } }), { type: 'play', card: 1 });
  assert.ok(types(s).includes('eatppeok'));
  assert.equal(s.captured[0].length, 5);
  s = applyAction(mk({ ...base, ppeokOwner: { 1: 0 } }), { type: 'play', card: 1 });
  assert.ok(types(s).includes('jappeok'));
  assert.equal(s.captured[0].length, 6);
});
test('쪽: 낸 패와 같은 월을 뒤집으면 먹고 피 1장', () => {
  const s = applyAction(mk({ hands: [[2, 40], [44]], floor: [6], deck: [45, 3], captured: [[], [10, 11]] }), { type: 'play', card: 2 });
  assert.ok(types(s).includes('jjok'));
  assert.ok(s.captured[0].includes(2) && s.captured[0].includes(3));
  assert.equal(s.captured[1].length, 1);
});
test('따닥: 바닥 두 장 + 낸 패 + 뒤집은 패', () => {
  let s = mk({ hands: [[3, 40], [44]], floor: [1, 2, 6], deck: [45, 0], captured: [[], [10]] });
  s = applyAction(s, { type: 'play', card: 3 });
  assert.equal(s.phase, 'choose');
  assert.deepEqual(legalActions(s).map((a) => a.card).sort(), [1, 2]);
  s = applyAction(s, { type: 'choose', card: 1 });
  assert.ok(types(s).includes('ttadak'));
  assert.deepEqual(s.captured[0].sort((a, b) => a - b), [0, 1, 2, 3, 10]);
  assert.deepEqual(s.floor, [6]);
});
test('싹쓸이: 바닥을 비우면 피 1장 (마지막 뒤집기 제외)', () => {
  let s = applyAction(mk({ hands: [[3, 40], [44]], floor: [2, 6], deck: [45, 7], captured: [[], [10]] }), { type: 'play', card: 3 });
  assert.ok(types(s).includes('sweep'));
  assert.equal(s.captured[0].length, 5);
  s = applyAction(mk({ hands: [[3], [44]], floor: [2, 6], deck: [7], captured: [[], [10]] }), { type: 'play', card: 3 });
  assert.ok(!types(s).includes('sweep'));
});
test('폭탄: 같은 월 3장 + 바닥 1장, 흔들기 1회와 뒤집기 2번', () => {
  let s = mk({ hands: [[0, 1, 2, 40], [44, 45]], floor: [3, 6], deck: [46, 47, 41, 42], captured: [[], [10]] });
  assert.ok(legalActions(s).some((a) => a.type === 'bomb' && a.month === 1));
  s = applyAction(s, { type: 'bomb', month: 1 });
  assert.ok(types(s).includes('bomb'));
  assert.ok([0, 1, 2, 3].every((c) => s.captured[0].includes(c)));
  assert.equal(s.dummy[0], 2);
  assert.equal(s.shakes[0], 1);
  assert.equal(s.hands[0].length, 1);
  s = applyAction(s, { type: 'play', card: 44 });
  assert.ok(legalActions(s).some((a) => a.type === 'flip'));
  s = applyAction(s, { type: 'flip' });
  assert.equal(s.dummy[0], 1);
});
test('흔들기: 같은 월 3장, 바닥에 없음', () => {
  const s0 = mk({ hands: [[0, 1, 2, 40], [44]], floor: [6], deck: [45, 46] });
  assert.ok(legalActions(s0).some((a) => a.shake));
  const s = applyAction(s0, { type: 'play', card: 0, shake: true });
  assert.equal(s.shakes[0], 1);
  assert.ok(types(s).includes('shake'));
});
test('총통: 손에 같은 월 4장이면 바로 승리', () => {
  const s = newGame({ deck: range(48) }); // 첫 손패 0~9 = 1월 4장
  assert.equal(s.phase, 'end');
  assert.equal(s.result.reason, 'chongtong');
  assert.equal(settle(s).final, 10);
});
test('바닥 4장이면 다시 섞기', () => {
  for (let i = 0; i < 200; i += 1) {
    const s = newGame();
    const months = s.floor.map((c) => Math.floor(c / 4));
    assert.ok(!months.some((m) => months.filter((x) => x === m).length === 4));
    assert.equal(allCards(s).length, 48);
  }
});
test('나가리: 아무도 나지 못하고 패가 끝나면 다음 판 2배', () => {
  let s = mk({ hands: [[40], [44]], floor: [6], deck: [20, 16] });
  s = applyAction(s, { type: 'play', card: 40 });
  s = applyAction(s, { type: 'play', card: 44 });
  assert.equal(s.phase, 'end');
  assert.equal(s.result.reason, 'nagari');
  assert.equal(settle(s).nextCarry, 2);
});
test('7점 이상이면 고/스톱, 고 뒤에는 점수가 올라야 다시 묻는다', () => {
  let s = mk({ hands: [[9, 40, 41], [44, 45, 46]], floor: [10, 20], deck: [26, 27, 16, 17], captured: [[1, 5, 13, 17, 21, 24, 0, 8], []] });
  // 홍단 미완성(1,5) + 3광 아님(0,8): 9(3월 홍단)로 10을 먹으면 홍단 3 + 띠 5장 1 = 4점... 광 0+8 → 2광
  s = applyAction(s, { type: 'play', card: 9 });
  assert.equal(scoreOf(s.captured[0]).total >= 4, true);
  // 직접 7점 상황
  s = mk({ hands: [[9, 40, 41], [44, 45, 46]], floor: [10, 20], deck: [26, 27, 16, 17], captured: [[1, 5, 0, 8, 28, 2], []] });
  s = applyAction(s, { type: 'play', card: 9 }); // 홍단 3 + 3광 3 = 6? → 광 0,8,28 = 3, 홍단 1,5,9 = 3 → 6점
  assert.equal(s.phase, 'play');
  s = mk({ hands: [[9, 40, 41], [44, 45, 46]], floor: [10, 20], deck: [26, 27, 16, 17], captured: [[1, 5, 0, 8, 28, 13, 17, 25], []] });
  s = applyAction(s, { type: 'play', card: 9 }); // 3광 3 + 홍단 3 + 초단 3 + 띠 6장 2 = 11
  assert.equal(s.phase, 'goStop');
  assert.equal(s.turn, 0);
  s = applyAction(s, { type: 'go' });
  assert.equal(s.goCount[0], 1);
  assert.equal(s.goScore[0], 11);
  assert.equal(s.turn, 1);
  s = applyAction(s, { type: 'play', card: 44 });
  s = applyAction(s, { type: 'play', card: 40 }); // 점수 그대로 → 묻지 않음
  assert.equal(s.phase, 'play');
  assert.equal(s.turn, 1);
});
test('3뻑이면 승리', () => {
  const s = applyAction(mk({ hands: [[3, 40], [44]], floor: [2], deck: [45, 0], ppeok: [2, 0] }), { type: 'play', card: 3 });
  assert.equal(s.result.reason, 'ppeok3');
  assert.equal(settle(s).final, 7);
});
test('잘못된 행동은 거부', () => {
  assert.throws(() => applyAction(mk({ hands: [[3], [44]], floor: [2], deck: [45] }), { type: 'play', card: 44 }));
  assert.throws(() => applyAction(mk({ hands: [[3], [44]], floor: [2], deck: [45] }), { type: 'bomb', month: 1 }));
});

console.log(`engine tests: ${passed} passed`);
