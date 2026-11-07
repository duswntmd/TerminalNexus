// 고스톱 맞고(2인) 규칙 엔진 — 화면과 분리된 순수 함수. 채택 규칙과 출처는 RULES.md.
// 서버(GostopGame.java)도 같은 규칙을 따른다.
// 상태는 평범한 객체이고 applyAction은 새 상태를 돌려준다(입력 상태는 바꾸지 않음).
import { CARDS, GWANG, YEOL, TTI, PI, monthOf } from '../../../components/hwatu/cards.js';

export const HAND_SIZE = 10;
export const FLOOR_SIZE = 8;
export const WIN_SCORE = 7;
export const CHONGTONG_SCORE = 10;
export const PPEOK3_SCORE = 7;
export const PIBAK_MAX = 7; // 패자 피가 이 장수 이하면 피박
export const MEONGTTA_MIN = 7; // 열끗 이 장수 이상이면 멍따
export const FIRST_PPEOK_BONUS = 3; // 첫뻑
export const YEON_PPEOK_BONUS = 6; // 연뻑 (첫 차례·두 번째 차례 연속 뻑)
export const CARRY_MAX = 16; // 나가리 배수 상한
export const GUKJIN_ID = 32; // 9월 열끗

const range = (n) => Array.from({ length: n }, (_, i) => i);

export const shuffle = (arr, rng = Math.random) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const clone = (s) => ({
  ...s,
  deck: s.deck.slice(),
  floor: s.floor.slice(),
  hands: s.hands.map((h) => h.slice()),
  captured: s.captured.map((c) => c.slice()),
  dummy: s.dummy.slice(),
  shakes: s.shakes.slice(),
  ppeok: s.ppeok.slice(),
  ppeokRun: s.ppeokRun.slice(),
  turns: s.turns.slice(),
  bonus: s.bonus.slice(),
  goCount: s.goCount.slice(),
  goScore: s.goScore.slice(),
  gukjin: s.gukjin.slice(),
  ppeokOwner: { ...s.ppeokOwner },
  pending: s.pending ? { ...s.pending, takes: s.pending.takes.slice() } : null,
  events: [],
});

const monthCount = (cards, month) => cards.filter((c) => monthOf(c) === month).length;

/**
 * 새 판. 손에 같은 월 4장(총통)이면 바로 승리, 바닥에 같은 월 4장이면 나가리,
 * 바닥에 같은 월 3장은 자연뻑(가져가는 사람이 피 1장).
 * deck은 배열 끝이 맨 위(pop으로 뒤집음). 덱 0~9 선 손패, 10~19 후 손패, 20~27 바닥.
 */
export const newGame = ({ first = 0, rng = Math.random, carry = 1, deck: fixedDeck = null } = {}) => {
  const deck = fixedDeck ? fixedDeck.slice() : shuffle(range(48), rng);
  const floor = deck.slice(20, 28);
  const hands = [deck.slice(0, 10), deck.slice(10, 20)];
  if (first === 1) hands.reverse();
  const state = {
    deck: deck.slice(28),
    floor,
    hands,
    captured: [[], []],
    dummy: [0, 0],
    shakes: [0, 0],
    ppeok: [0, 0],
    ppeokRun: [0, 0], // 첫 차례부터 연속으로 뻑을 한 횟수 (첫뻑·연뻑)
    turns: [0, 0], // 각자 마친 차례 수
    bonus: [0, 0], // 첫뻑·연뻑으로 상대에게 받을 점수
    goCount: [0, 0],
    goScore: [0, 0],
    gukjin: [null, null], // null: 자동, 'yeol' | 'pi': 고정
    ppeokOwner: {}, // 월 → 뻑을 싼 사람 (-1: 처음부터 바닥에 깔린 자연뻑)
    first,
    turn: first,
    turnNo: 0,
    phase: 'play',
    pending: null,
    carry,
    events: [],
    last: null,
    result: null,
  };
  for (const p of [first, 1 - first]) {
    const m = range(12).find((mm) => monthCount(hands[p], mm + 1) === 4);
    if (m !== undefined) {
      state.phase = 'end';
      state.result = { winner: p, reason: 'chongtong', month: m + 1 };
      state.events.push({ type: 'chongtong', player: p, month: m + 1 });
      return state;
    }
  }
  for (let m = 1; m <= 12; m += 1) {
    const n = monthCount(floor, m);
    if (n === 4) {
      state.phase = 'end';
      state.result = { winner: null, reason: 'nagari', floor4: m };
      state.events.push({ type: 'floor4', month: m });
      return state;
    }
    if (n === 3) state.ppeokOwner[m] = -1;
  }
  return state;
};

/* ───────────── 점수 ───────────── */

/** 국진을 피로 셀지: 'pi' | 'yeol' 고정값, null이면 두 경우 중 점수가 높은 쪽 */
export const scoreOf = (captured, gukjin = null) => {
  if (gukjin == null && captured.includes(GUKJIN_ID)) {
    const a = scoreOf(captured, 'yeol');
    const b = scoreOf(captured, 'pi');
    return b.total > a.total ? b : a;
  }
  const asPi = gukjin === 'pi';
  const cs = captured.map((id) => CARDS[id]);
  const gw = cs.filter((c) => c.kind === GWANG);
  const yeol = cs.filter((c) => c.kind === YEOL && !(asPi && c.gukjin));
  const tti = cs.filter((c) => c.kind === TTI);
  const piCount = cs.reduce((n, c) => n + c.pi, 0) + (asPi && captured.includes(GUKJIN_ID) ? 2 : 0);
  const hasBi = gw.some((c) => c.bi);
  const items = [];

  let gwang = 0;
  if (gw.length === 5) { gwang = 15; items.push(['ogwang', 15]); }
  else if (gw.length === 4) { gwang = 4; items.push(['sagwang', 4]); }
  else if (gw.length === 3) { gwang = hasBi ? 2 : 3; items.push([hasBi ? 'bisamgwang' : 'samgwang', gwang]); }

  let ttiScore = 0;
  for (const r of ['hong', 'cheong', 'cho']) {
    if (tti.filter((c) => c.ribbon === r).length === 3) { ttiScore += 3; items.push([`${r}dan`, 3]); }
  }
  if (tti.length >= 5) { ttiScore += tti.length - 4; items.push(['tti', tti.length - 4]); }

  let yeolScore = 0;
  if (yeol.filter((c) => c.bird).length === 3) { yeolScore += 5; items.push(['godori', 5]); }
  if (yeol.length >= 5) { yeolScore += yeol.length - 4; items.push(['yeol', yeol.length - 4]); }

  const piScore = piCount >= 10 ? piCount - 9 : 0;
  if (piScore) items.push(['pi', piScore]);

  return {
    total: gwang + ttiScore + yeolScore + piScore,
    gwang, tti: ttiScore, yeol: yeolScore, pi: piScore,
    counts: { gwang: gw.length, yeol: yeol.length, tti: tti.length, pi: piCount },
    gukjin: captured.includes(GUKJIN_ID) ? (asPi ? 'pi' : 'yeol') : null,
    items,
  };
};

export const playerScore = (state, p) => scoreOf(state.captured[p], state.gukjin[p]);

/* ───────────── 행동 ───────────── */

const sameKind = (a, b) => {
  const x = CARDS[a];
  const y = CARDS[b];
  return x.kind === y.kind && x.pi === y.pi && x.ribbon === y.ribbon && x.bird === y.bird && !x.gukjin && !y.gukjin;
};

/** 현재 차례 사람이 할 수 있는 행동 목록 */
export const legalActions = (state) => {
  if (state.phase === 'end') return [];
  const p = state.turn;
  if (state.phase === 'goStop') return [{ type: 'go' }, { type: 'stop' }];
  if (state.phase === 'choose') return state.pending.options.map((card) => ({ type: 'choose', card }));
  const hand = state.hands[p];
  const acts = [];
  const months = new Set();
  for (const card of hand) {
    const m = monthOf(card);
    const inHand = monthCount(hand, m);
    const onFloor = monthCount(state.floor, m);
    acts.push({ type: 'play', card });
    if (inHand === 3 && onFloor === 0) acts.push({ type: 'play', card, shake: true });
    if (inHand === 3 && onFloor === 1 && !months.has(m)) { months.add(m); acts.push({ type: 'bomb', month: m }); }
  }
  if (state.dummy[p] > 0 && state.deck.length > 0) acts.push({ type: 'flip' });
  return acts;
};

const steal = (s, p, n, events) => {
  const opp = 1 - p;
  let got = 0;
  for (let i = 0; i < n; i += 1) {
    const cap = s.captured[opp];
    const pis = cap.filter((id) => CARDS[id].kind === PI);
    let pick = pis.find((id) => CARDS[id].pi === 1) ?? pis.find((id) => CARDS[id].pi === 2);
    if (pick === undefined && s.gukjin[opp] === 'pi' && cap.includes(GUKJIN_ID)) pick = GUKJIN_ID;
    if (pick === undefined) break;
    cap.splice(cap.indexOf(pick), 1);
    s.captured[p].push(pick);
    got += 1;
  }
  if (got) events.push({ type: 'steal', player: p, count: got });
};

/** 뻑 더미(3장)를 가져갈 때 피 뺏기: 남의 뻑·자연뻑 1장, 자기 뻑(자뻑) 2장 */
const takeStack = (s, pd, month) => {
  const owner = s.ppeokOwner[month];
  if (owner === undefined) return;
  delete s.ppeokOwner[month];
  pd.steal += owner === pd.player ? 2 : 1;
  s.events.push({ type: owner === pd.player ? 'jappeok' : 'eatppeok', player: pd.player, month });
};

/**
 * 행동 적용. action: {type:'play', card, shake?} | {type:'bomb', month} | {type:'flip'}
 *   | {type:'choose', card} | {type:'go'} | {type:'stop'} | {type:'gukjin', player, value}
 */
export const applyAction = (prev, action) => {
  if (action.type === 'gukjin') {
    const s = clone(prev);
    s.gukjin[action.player] = action.value ?? null;
    return s;
  }
  if (prev.phase === 'end') throw new Error('game_over');
  const s = clone(prev);
  const p = s.turn;

  if (s.phase === 'goStop') {
    if (action.type === 'go') {
      s.goCount[p] += 1;
      s.goScore[p] = playerScore(s, p).total;
      s.events.push({ type: 'go', player: p, count: s.goCount[p] });
      return passTurn(s);
    }
    if (action.type === 'stop') {
      s.events.push({ type: 'stop', player: p });
      return finish(s, { winner: p, reason: 'stop' });
    }
    throw new Error('illegal');
  }

  if (s.phase === 'choose') {
    if (action.type !== 'choose' || !s.pending.options.includes(action.card)) throw new Error('illegal');
    const pd = s.pending;
    pd.takes.push(pd.chooseCard, action.card);
    if (pd.stage === 'hand') pd.handPair = action.card;
    pd.options = null;
    s.phase = 'play';
    return pd.stage === 'hand' ? flipStep(s, pd) : endTurn(s, pd);
  }

  // phase === 'play'
  const hand = s.hands[p];
  const pd = { player: p, stage: 'hand', played: null, month: null, m: 0, takes: [], steal: 0, placed: null, handPair: null, flipped: null, bomb: false };

  if (action.type === 'flip') {
    if (s.dummy[p] <= 0) throw new Error('illegal');
    s.dummy[p] -= 1;
    return flipStep(s, pd);
  }

  if (action.type === 'bomb') {
    const mine = hand.filter((c) => monthOf(c) === action.month);
    const floorM = s.floor.filter((c) => monthOf(c) === action.month);
    if (mine.length !== 3 || floorM.length !== 1) throw new Error('illegal');
    mine.forEach((c) => hand.splice(hand.indexOf(c), 1));
    pd.month = action.month;
    pd.bomb = true;
    pd.played = mine[0];
    pd.m = 3;
    pd.takes.push(...mine, floorM[0]);
    pd.steal += 1;
    s.shakes[p] += 1;
    s.dummy[p] += 2;
    s.events.push({ type: 'bomb', player: p, month: action.month, cards: mine });
    return flipStep(s, pd);
  }

  if (action.type !== 'play' || !hand.includes(action.card)) throw new Error('illegal');
  const card = action.card;
  const month = monthOf(card);
  const matches = s.floor.filter((c) => monthOf(c) === month);
  if (action.shake) {
    if (monthCount(hand, month) !== 3 || matches.length !== 0) throw new Error('illegal');
    s.shakes[p] += 1;
    s.events.push({ type: 'shake', player: p, month, cards: hand.filter((c) => monthOf(c) === month) });
  }
  hand.splice(hand.indexOf(card), 1);
  pd.played = card;
  pd.month = month;
  pd.m = matches.length;
  s.events.push({ type: 'play', player: p, card });

  if (matches.length === 0) {
    s.floor.push(card);
    pd.placed = card;
  } else if (matches.length === 1) {
    pd.takes.push(card, matches[0]);
    pd.handPair = matches[0];
  } else if (matches.length === 2) {
    if (sameKind(matches[0], matches[1])) {
      pd.takes.push(card, matches[0]);
      pd.handPair = matches[0];
    } else {
      pd.chooseCard = card;
      pd.options = matches;
      s.pending = pd;
      s.phase = 'choose';
      return s;
    }
  } else {
    pd.takes.push(card, ...matches);
    takeStack(s, pd, month);
  }
  return flipStep(s, pd);
};

/** 덱에서 한 장 뒤집기 */
const flipStep = (s, pd) => {
  pd.stage = 'flip';
  s.pending = null;
  if (!s.deck.length) return endTurn(s, pd);
  const f = s.deck.pop();
  const fm = monthOf(f);
  pd.flipped = f;
  pd.lastFlip = s.deck.length === 0; // 마지막 차례: 뻑·쪽·따닥·쓸 인정 안 함
  s.events.push({ type: 'flip', player: pd.player, card: f });

  if (pd.played != null && !pd.bomb && fm === pd.month) {
    if (pd.m === 0) {
      // 쪽: 낸 패가 바닥에 깔렸는데 같은 월이 뒤집힘
      pd.takes.push(pd.placed, f);
      if (!pd.lastFlip) {
        pd.steal += 1;
        s.events.push({ type: 'jjok', player: pd.player });
      }
    } else if (pd.m === 1) {
      // 뻑: 세 장이 바닥에 남는다
      pd.takes = pd.takes.filter((c) => c !== pd.played && c !== pd.handPair);
      s.floor.push(pd.played, f);
      if (!pd.lastFlip) {
        s.ppeokOwner[pd.month] = pd.player;
        s.ppeok[pd.player] += 1;
        pd.ppeok = true;
        s.events.push({ type: 'ppeok', player: pd.player, month: pd.month, count: s.ppeok[pd.player] });
      }
    } else if (pd.m === 2) {
      // 따닥: 바닥 두 장 + 낸 패 + 뒤집은 패
      const rest = s.floor.filter((c) => monthOf(c) === pd.month && !pd.takes.includes(c));
      pd.takes.push(...rest, f);
      if (!pd.lastFlip) {
        pd.steal += 1;
        s.events.push({ type: 'ttadak', player: pd.player });
      }
    }
    return endTurn(s, pd);
  }

  const matches = s.floor.filter((c) => monthOf(c) === fm && !pd.takes.includes(c));
  if (matches.length === 0) {
    s.floor.push(f);
  } else if (matches.length === 1) {
    pd.takes.push(f, matches[0]);
  } else if (matches.length === 2) {
    if (sameKind(matches[0], matches[1])) pd.takes.push(f, matches[0]);
    else {
      pd.chooseCard = f;
      pd.options = matches;
      s.pending = pd;
      s.phase = 'choose';
      return s;
    }
  } else {
    pd.takes.push(f, ...matches);
    takeStack(s, pd, fm);
  }
  return endTurn(s, pd);
};

/** 먹은 패 확정, 싹쓸이·피 뺏기, 고/스톱 판단 */
const endTurn = (s, pd) => {
  const p = pd.player;
  s.pending = null;
  s.phase = 'play';
  const takes = [...new Set(pd.takes)];
  s.floor = s.floor.filter((c) => !takes.includes(c));
  s.captured[p].push(...takes);
  if (takes.length && s.floor.length === 0 && s.deck.length > 0) {
    pd.steal += 1;
    s.events.push({ type: 'sweep', player: p });
  }
  if (pd.steal) steal(s, p, pd.steal, s.events);
  s.last = { player: p, played: pd.played, flipped: pd.flipped, took: takes };
  s.turnNo += 1;

  // 첫뻑·연뻑: 자기 첫 차례부터 연속으로 뻑을 하면 상대에게 점수를 바로 받는다
  if (pd.ppeok && s.ppeokRun[p] === s.turns[p]) {
    s.ppeokRun[p] += 1;
    if (s.ppeokRun[p] === 1) { s.bonus[p] += FIRST_PPEOK_BONUS; s.events.push({ type: 'firstppeok', player: p, points: FIRST_PPEOK_BONUS }); }
    else if (s.ppeokRun[p] === 2) { s.bonus[p] += YEON_PPEOK_BONUS; s.events.push({ type: 'yeonppeok', player: p, points: YEON_PPEOK_BONUS }); }
  }
  s.turns[p] += 1;

  if (s.ppeok[p] >= 3) return finish(s, { winner: p, reason: 'ppeok3' });

  const sc = playerScore(s, p).total;
  const ready = s.goCount[p] === 0 ? sc >= WIN_SCORE : sc > s.goScore[p];
  if (ready) {
    // 남은 패가 없으면 고를 할 수 없으므로 바로 난다
    if (s.hands[p].length + s.dummy[p] === 0 || s.deck.length === 0) return finish(s, { winner: p, reason: 'stop' });
    s.phase = 'goStop';
    s.events.push({ type: 'canGo', player: p, score: sc });
    return s;
  }
  return passTurn(s);
};

const passTurn = (s) => {
  const next = 1 - s.turn;
  const canMove = (q) => s.hands[q].length > 0 || (s.dummy[q] > 0 && s.deck.length > 0);
  if (!canMove(next) && !canMove(s.turn)) return finish(s, { winner: null, reason: 'nagari' });
  s.turn = canMove(next) ? next : s.turn;
  s.phase = 'play';
  return s;
};

const finish = (s, result) => {
  s.phase = 'end';
  s.pending = null;
  s.result = result;
  if (result.reason === 'nagari') s.events.push({ type: 'nagari' });
  return s;
};

/* ───────────── 정산 ───────────── */

/**
 * 판 결과 계산. 패자 국진이 자동이면 박을 피하는 쪽으로 센다.
 * 반환: { winner, reason, base, score, goCount, multipliers: [[key, x]], final, bonus: [첫뻑·연뻑 점수], nextCarry }
 */
export const settle = (state) => {
  const r = state.result;
  if (!r) return null;
  const carry = state.carry || 1;
  const bonus = (state.bonus || [0, 0]).slice();
  const muls = [];
  if (carry > 1) muls.push(['carry', carry]);
  if (r.reason === 'nagari') return { winner: null, reason: r.floor4 ? 'floor4' : 'nagari', base: 0, final: 0, multipliers: muls, bonus, nextCarry: Math.min(carry * 2, CARRY_MAX) };
  const w = r.winner;
  const l = 1 - w;
  if (r.reason === 'chongtong' || r.reason === 'ppeok3') {
    const base = r.reason === 'chongtong' ? CHONGTONG_SCORE : PPEOK3_SCORE;
    return { winner: w, reason: r.reason, base, score: null, goCount: 0, multipliers: muls, final: base * carry, bonus, nextCarry: 1 };
  }
  const ws = playerScore(state, w);
  const go = state.goCount[w];
  const base = ws.total + go;
  if (go >= 3) muls.push(['go', 2 ** (go - 2)]);
  if (state.shakes[w]) muls.push(['shake', 2 ** state.shakes[w]]);
  if (ws.counts.yeol >= MEONGTTA_MIN) muls.push(['meongtta', 2]);

  const bak = (g) => {
    const ls = scoreOf(state.captured[l], g);
    const list = [];
    if (ws.pi > 0 && ls.counts.pi <= PIBAK_MAX) list.push(['pibak', 2]);
    if (ws.gwang > 0 && ls.counts.gwang === 0) list.push(['gwangbak', 2]);
    return list;
  };
  let baks = bak(state.gukjin[l] || 'yeol');
  if (state.gukjin[l] == null && state.captured[l].includes(GUKJIN_ID)) {
    const alt = bak('pi');
    if (alt.length < baks.length) baks = alt;
  }
  muls.push(...baks);
  if (state.goCount[l] > 0) muls.push(['gobak', 2]);
  const final = muls.reduce((n, [, x]) => n * x, base);
  return { winner: w, reason: 'stop', base, score: ws, goCount: go, multipliers: muls, final, bonus, nextCarry: 1 };
};

/* ───────────── 보기 제한 (AI·온라인용) ───────────── */

/** p가 볼 수 있는 정보만 남긴 상태: 상대 손패와 덱은 장수만 */
export const viewFor = (state, p) => ({
  ...clone(state),
  events: state.events,
  hands: state.hands.map((h, i) => (i === p ? h.slice() : h.map(() => -1))),
  deck: state.deck.map(() => -1),
});

/** 고르기 대기 중이라 아직 어디에도 놓이지 않은 카드 (낸 패, 뒤집은 패) */
export const limboCards = (s) => (s.pending ? [...new Set([s.pending.chooseCard, ...s.pending.takes])].filter((c) => !s.floor.includes(c)) : []);

/** 카드 48장 보존 확인 (시험용) */
export const allCards = (s) => [...s.deck, ...s.floor, ...s.hands[0], ...s.hands[1], ...s.captured[0], ...s.captured[1], ...limboCards(s)];

/** 판 결과로 p가 얻는(음수면 잃는) 점수: 승패 점수 + 첫뻑·연뻑 보너스 차이 */
export const netScore = (st, p) => {
  if (!st) return 0;
  const win = st.winner == null ? 0 : (st.winner === p ? 1 : -1) * st.final;
  const b = st.bonus || [0, 0];
  return win + b[p] - b[1 - p];
};
