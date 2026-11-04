// 맞고 AI. viewFor로 가린 상태만 받는다(상대 손패와 덱 순서를 모름).
// easy: 눈앞의 짝 맞추기 위주. hard: 모르는 패를 무작위로 배치해 여러 번 시험해 보고 고른다.
import { CARDS, GWANG, YEOL, TTI, monthOf } from '../../../components/hwatu/cards.js';
import { applyAction, legalActions, scoreOf, shuffle } from './engine.js';

const RIBBONS = ['hong', 'cheong', 'cho'];
const GW_PROGRESS = [0, 1.5, 4, 9, 13, 24];
const SET_PROGRESS = [0, 0.8, 2.6, 7];

/** 먹은 패의 가치(점수 + 족보 진행도). 상대가 이미 한 장 가진 족보는 진행도를 세지 않는다 */
export const progress = (mine, theirs) => {
  const cs = mine.map((id) => CARDS[id]);
  const os = theirs.map((id) => CARDS[id]);
  const count = (list, f) => list.filter(f).length;
  let v = scoreOf(mine).total * 3;
  v += GW_PROGRESS[count(cs, (c) => c.kind === GWANG)];
  if (!count(os, (c) => c.bird)) v += SET_PROGRESS[count(cs, (c) => c.bird)];
  for (const r of RIBBONS) if (!count(os, (c) => c.ribbon === r)) v += SET_PROGRESS[count(cs, (c) => c.ribbon === r)];
  const tti = count(cs, (c) => c.kind === TTI);
  const yeol = count(cs, (c) => c.kind === YEOL);
  const pi = cs.reduce((n, c) => n + c.pi, 0);
  v += Math.max(0, tti - 2) * 0.7 + Math.max(0, yeol - 2) * 0.7;
  v += pi * 0.45 + Math.max(0, pi - 6) * 0.5;
  return v;
};

/** 카드 한 장이 그 사람에게 주는 가치 */
const cardGain = (id, mine, theirs) => progress([...mine, id], theirs) - progress(mine, theirs);

/** 내가 모르는 카드 (상대 손패 + 덱) */
const unknownOf = (view, me) => {
  const seen = new Set([...view.hands[me], ...view.floor, ...view.captured[0], ...view.captured[1]]);
  return Array.from({ length: 48 }, (_, i) => i).filter((i) => !seen.has(i));
};

/** 가린 상태에 모르는 카드를 무작위로 채워 완전한 상태로 만든다 */
const determinize = (view, me, rng) => {
  const pool = shuffle(unknownOf(view, me), rng);
  const opp = 1 - me;
  const s = { ...view, hands: view.hands.slice(), events: [] };
  const n = view.hands[opp].length;
  s.hands[opp] = pool.slice(0, n);
  s.deck = pool.slice(n, n + view.deck.length);
  return s;
};

/** 바닥에 남긴 카드를 상대가 가져갈 위험 */
const floorRisk = (view, me, floor) => {
  const opp = 1 - me;
  const unknown = unknownOf(view, me);
  const oppHand = view.hands[opp].length;
  if (!unknown.length) return 0;
  let risk = 0;
  const byMonth = {};
  floor.forEach((c) => { (byMonth[monthOf(c)] ||= []).push(c); });
  for (const [m, cards] of Object.entries(byMonth)) {
    const left = unknown.filter((c) => monthOf(c) === Number(m)).length;
    if (!left) continue;
    const pHas = 1 - ((unknown.length - left) / unknown.length) ** oppHand;
    const best = Math.max(...cards.map((c) => cardGain(c, view.captured[opp], view.captured[me])));
    risk += pHas * best;
  }
  return risk;
};

const evaluate = (s, me) => {
  const opp = 1 - me;
  if (s.phase === 'end') {
    if (s.result.winner === me) return 200;
    if (s.result.winner === opp) return -200;
  }
  return progress(s.captured[me], s.captured[opp]) - progress(s.captured[opp], s.captured[me]);
};

/** 고르기 단계: 내게 가치가 큰 카드(상대에게 줄 가치도 반영) */
const chooseBest = (s, me) => {
  const opp = 1 - me;
  let best = s.pending.options[0];
  let bestV = -Infinity;
  for (const c of s.pending.options) {
    const v = cardGain(c, s.captured[me], s.captured[opp]) + 0.5 * cardGain(c, s.captured[opp], s.captured[me]);
    if (v > bestV) { bestV = v; best = c; }
  }
  return { type: 'choose', card: best };
};

/** 내 차례가 끝날 때까지 진행(고르기는 탐욕적으로) */
const runTurn = (s, action, me) => {
  let st = applyAction(s, action);
  while (st.phase === 'choose' && st.turn === me) st = applyAction(st, chooseBest(st, me));
  return st;
};

const actionKey = (a) => `${a.type}:${a.card ?? a.month ?? ''}:${a.shake ? 1 : 0}`;

const decidePlay = (view, me, level, rng) => {
  const acts = legalActions(view);
  if (acts.length === 1) return acts[0];
  const uniq = [...new Map(acts.map((a) => [actionKey(a), a])).values()];
  const samples = level === 'hard' ? 24 : 4;
  const scored = uniq.map((a) => {
    let total = 0;
    for (let i = 0; i < samples; i += 1) {
      const full = determinize(view, me, rng);
      const after = runTurn(full, a, me);
      total += evaluate(after, me);
      if (level === 'hard' && after.phase !== 'end') total -= floorRisk(view, me, after.floor) * 0.8;
    }
    let v = total / samples;
    if (level !== 'hard') v += rng() * 2.5; // 쉬움: 가끔 덜 좋은 수
    return [v, a];
  });
  scored.sort((x, y) => y[0] - x[0]);
  return scored[0][1];
};

/** 고/스톱 판단 */
const decideGo = (view, me, level, rng) => {
  const opp = 1 - me;
  const mine = scoreOf(view.captured[me]).total;
  const theirs = scoreOf(view.captured[opp]).total;
  const left = view.hands[me].length + view.dummy[me];
  if (left <= 1 || view.deck.length <= 2) return { type: 'stop' };
  if (level !== 'hard') return { type: theirs <= 3 && left >= 3 && rng() < 0.55 ? 'go' : 'stop' };
  // 상대 위협: 현재 점수 + 족보 진행도
  const threat = theirs + progress(view.captured[opp], view.captured[me]) / 6;
  const goes = view.goCount[me];
  const limit = goes >= 2 ? 4 : 6;
  if (threat >= limit) return { type: 'stop' };
  if (left < 3 && threat >= 3) return { type: 'stop' };
  if (mine >= 15 && threat >= 3) return { type: 'stop' };
  return { type: 'go' };
};

/** AI 결정. view는 viewFor(state, me) 결과 */
export const decide = (view, me, level = 'hard', rng = Math.random) => {
  if (view.phase === 'goStop') return decideGo(view, me, level, rng);
  if (view.phase === 'choose') return chooseBest(view, me);
  return decidePlay(view, me, level, rng);
};
