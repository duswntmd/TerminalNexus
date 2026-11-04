/* 섯다 규칙 엔진 (화면과 분리된 순수 함수)
 * 서버(kr.pe.tn.domain.seotda.engine)에도 같은 판정이 있다. 규칙을 바꾸면 두 곳을 함께 고치고
 * node scripts/seotda-test.mjs 와 서버 SeotdaRulesTest 로 확인한다.
 *
 * 카드: 0~19. 월 = id/2 + 1, 짝수 id 가 그 달의 특별한 패(1·3·8월 광, 나머지 열끗)
 */

export const CARD_COUNT = 20;
export const monthOf = (id) => (id >> 1) + 1;
export const isGwang = (id) => id % 2 === 0 && [1, 3, 8].includes(monthOf(id));
/** 패 그림 종류: gwang(광) · yeol(열끗) · tti(띠). 8월 두 번째 장은 기러기(열끗) */
export const cardKind = (id) => {
  const m = monthOf(id);
  if (id % 2 === 0) return [1, 3, 8].includes(m) ? 'gwang' : 'yeol';
  return m === 8 ? 'yeol' : 'tti';
};
const YEOL = (m) => (m - 1) * 2; // 그 달 첫 장(광 또는 열끗)의 id

/** 2장 패의 기본 족보. base 가 클수록 세다 (특수패는 상대에 따라 resolve 에서 바뀜) */
export const classify = (a, b) => {
  const [x, y] = a < b ? [a, b] : [b, a];
  const m1 = monthOf(x);
  const m2 = monthOf(y);
  if (x === YEOL(3) && y === YEOL(8)) return { code: 'gwang38', base: 1000 };
  if (x === YEOL(1) && y === YEOL(3)) return { code: 'gwang13', base: 900 };
  if (x === YEOL(1) && y === YEOL(8)) return { code: 'gwang18', base: 900 };
  if (m1 === m2) return { code: 'ttaeng', month: m1, base: 700 + m1 * 10 };
  const pair = `${m1}-${m2}`;
  const named = { '1-2': ['ali', 600], '1-4': ['doksa', 590], '1-9': ['gubbing', 580], '1-10': ['jangbbing', 570], '4-10': ['jangsa', 560], '4-6': ['seryuk', 550] }[pair];
  if (named) return { code: named[0], base: named[1] };
  const kkut = (m1 + m2) % 10;
  const hand = { code: 'kkut', kkut, base: 100 + kkut };
  if (x === YEOL(4) && y === YEOL(7)) hand.special = 'amhaeng';
  else if (x === YEOL(3) && y === YEOL(7)) hand.special = 'ttaengjabi';
  else if (pair === '4-9') hand.special = x === YEOL(4) && y === YEOL(9) ? 'mgusa' : 'gusa';
  return hand;
};

// 특수패가 살아날 때의 세기
const AMHAENG_ON = 950; // 13·18광땡을 잡음 (38광땡 아래)
const TTAENGJABI_ON = 795; // 1~9땡을 잡음 (장땡 아래)
const GUSA_LIMIT = 600; // 구사: 남은 상대 최고 패가 알리 이하면 재경기
const MGUSA_LIMIT = 790; // 멍텅구리구사: 9땡 이하면 재경기

/**
 * 승부 판정. entries: [{ seat, cards:[a,b] }] (다이하지 않은 사람만)
 * @returns {{ redo: boolean, redoSeat: number|null, winners: number[], hands: Object<number,{...hand, strength}> }}
 */
export const resolve = (entries) => {
  const hands = entries.map((e) => ({ seat: e.seat, ...classify(e.cards[0], e.cards[1]) }));
  const othersMax = (i) => Math.max(...hands.filter((_, j) => j !== i).map((h) => h.base));
  const out = {};

  for (let i = 0; i < hands.length; i++) {
    const h = hands[i];
    if (hands.length < 2) break;
    const limit = h.special === 'gusa' ? GUSA_LIMIT : h.special === 'mgusa' ? MGUSA_LIMIT : null;
    if (limit != null && othersMax(i) <= limit) {
      hands.forEach((x) => { out[x.seat] = { ...x, strength: x.base }; });
      return { redo: true, redoSeat: h.seat, winners: [], hands: out };
    }
  }

  hands.forEach((h, i) => {
    let strength = h.base;
    const others = hands.filter((_, j) => j !== i);
    if (h.special === 'amhaeng' && others.some((o) => o.base === 900)) strength = AMHAENG_ON;
    if (h.special === 'ttaengjabi' && others.some((o) => o.code === 'ttaeng' && o.month < 10)) strength = TTAENGJABI_ON;
    out[h.seat] = { ...h, strength, active: strength !== h.base };
  });
  const best = Math.max(...Object.values(out).map((h) => h.strength));
  const winners = hands.filter((h) => out[h.seat].strength === best).map((h) => h.seat);
  return { redo: false, redoSeat: null, winners, hands: out };
};

/* ── 한 판 진행 ──────────────────────────────────────────
 * 기본 판돈(ante)을 모두 내고 2장씩 받은 뒤 선부터 한 바퀴 베팅한다.
 * - 체크: 낼 돈이 없을 때 넘김
 * - 콜: 앞사람이 올린 만큼 맞춤
 * - 삥: 아무도 올리지 않았을 때 기본 판돈만큼 올림
 * - 하프: 콜하고 (판돈 + 콜 금액)의 절반을 더 올림 (10P 단위 올림)
 * - 다이: 포기
 * 올리기(삥·하프)는 한 판에 한 사람당 한 번. 한 사람이 낼 수 있는 총액은
 * 판 시작 때 가장 적게 가진 사람의 보유 포인트까지 (모두 콜할 수 있게 해 사이드 팟을 없앰)
 */

const ceil10 = (n) => Math.ceil(n / 10) * 10;

/** 무작위 덱 (rng: 0 이상 1 미만을 돌려주는 함수) */
export const shuffledDeck = (rng = Math.random) => {
  const d = Array.from({ length: CARD_COUNT }, (_, i) => i);
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
};

/**
 * 새 판. players: [{ id, name, chips }] (모두 chips >= ante 여야 함), dealer: 선의 자리 번호
 * carry: 재경기로 넘어온 판돈
 */
export const newHand = ({ players, dealer = 0, ante = 100, carry = 0, deck }) => {
  const n = players.length;
  const d = deck || shuffledDeck();
  const cap = Math.min(...players.map((p) => p.chips));
  const ps = players.map((p, i) => ({
    id: p.id,
    name: p.name,
    chips: p.chips - ante,
    contrib: ante,
    cards: [d[(i - dealer + n) % n], d[((i - dealer + n) % n) + n]], // 선부터 한 장씩 돌림
    folded: false,
    acted: false,
    raised: false,
    last: null,
  }));
  return {
    phase: 'betting',
    ante,
    cap,
    level: ante,
    pot: carry + ante * n,
    carry,
    dealer,
    turn: dealer,
    players: ps,
    log: [],
    result: null,
  };
};

/** 그 자리에서 할 수 있는 행동 [{ type, pay }] (pay: 이번에 낼 포인트) */
export const legalActions = (st, seat) => {
  if (st.phase !== 'betting' || st.turn !== seat) return [];
  const p = st.players[seat];
  const toCall = st.level - p.contrib;
  const acts = [{ type: 'die', pay: 0 }];
  if (toCall === 0) acts.push({ type: 'check', pay: 0 });
  else acts.push({ type: 'call', pay: toCall });
  if (!p.raised && st.level < st.cap) {
    if (st.level === st.ante) acts.push({ type: 'bbing', pay: Math.min(st.cap, st.level + st.ante) - p.contrib });
    const half = Math.min(st.cap, st.level + ceil10(Math.floor((st.pot + toCall) / 2)));
    if (half > st.level) acts.push({ type: 'half', pay: half - p.contrib });
  }
  return acts;
};

const live = (st) => st.players.map((p, i) => i).filter((i) => !st.players[i].folded);

/** 행동 적용 (새 상태를 돌려줌). 할 수 없는 행동이면 Error('illegal_action') */
export const applyAction = (st, seat, type) => {
  const act = legalActions(st, seat).find((a) => a.type === type);
  if (!act) throw new Error('illegal_action');
  const players = st.players.map((p) => ({ ...p }));
  const p = players[seat];
  let { level, pot } = st;
  p.chips -= act.pay;
  p.contrib += act.pay;
  pot += act.pay;
  p.acted = true;
  p.last = type;
  if (type === 'die') p.folded = true;
  if (type === 'bbing' || type === 'half') {
    p.raised = true;
    level = p.contrib;
    players.forEach((o, i) => { if (i !== seat && !o.folded) o.acted = false; });
  }
  const next = { ...st, players, level, pot, log: [...st.log, { seat, type, pay: act.pay }] };

  const alive = live(next);
  if (alive.length === 1) return finish(next, alive);
  const n = players.length;
  for (let k = 1; k <= n; k++) {
    const i = (seat + k) % n;
    const o = players[i];
    if (!o.folded && (!o.acted || o.contrib < level)) return { ...next, turn: i };
  }
  return finish(next, alive);
};

/** 선부터 도는 순서로 자리 정렬 */
const fromDealer = (st, seats) => [...seats].sort((a, b) => ((a - st.dealer + st.players.length) % st.players.length) - ((b - st.dealer + st.players.length) % st.players.length));

const finish = (st, alive) => {
  const players = st.players.map((p) => ({ ...p }));
  const payouts = {};
  let result;
  if (alive.length === 1) {
    payouts[alive[0]] = st.pot;
    result = { type: 'fold', winners: alive, payouts, reveal: [], hands: {}, nextDealer: alive[0], carry: 0 };
  } else {
    const r = resolve(alive.map((i) => ({ seat: i, cards: players[i].cards })));
    if (r.redo) {
      result = { type: 'redo', winners: [], payouts, reveal: alive, hands: r.hands, redoSeat: r.redoSeat, nextDealer: st.dealer, carry: st.pot };
    } else {
      const winners = fromDealer(st, r.winners);
      const share = Math.floor(st.pot / winners.length);
      winners.forEach((w, k) => { payouts[w] = share + (k === 0 ? st.pot - share * winners.length : 0); });
      result = { type: 'showdown', winners, payouts, reveal: alive, hands: r.hands, nextDealer: winners[0], carry: 0 };
    }
  }
  Object.entries(payouts).forEach(([i, v]) => { players[i].chips += v; });
  return { ...st, players, phase: 'done', turn: -1, result };
};

/** 화면 표시용 족보 이름 키와 값 (i18n: seotda.hands.*) */
export const handLabel = (hand) => {
  if (!hand) return null;
  if (hand.code === 'ttaeng') {
    if (hand.month === 10) return { key: 'jangttaeng' };
    if (hand.month === 1) return { key: 'bbingttaeng' };
    return { key: 'ttaeng', n: hand.month };
  }
  if (hand.code === 'kkut') {
    if (hand.special) return { key: hand.special, kkut: hand.kkut };
    if (hand.kkut === 9) return { key: 'gabo' };
    if (hand.kkut === 0) return { key: 'mangtong' };
    return { key: 'kkut', n: hand.kkut };
  }
  return { key: hand.code };
};
