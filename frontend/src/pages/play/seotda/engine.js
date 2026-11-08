/* 섯다 규칙 엔진 (화면과 분리된 순수 함수). 규칙은 RULES.md 를 따른다.
 * 서버(kr.pe.tn.domain.seotda.engine)에도 같은 판정이 있다. 규칙을 바꾸면 두 곳을 함께 고치고
 * node scripts/seotda-test.mjs --fixture 로 서버 대조 파일을 다시 만든 뒤 SeotdaRulesTest 로 확인한다.
 *
 * 카드: 0~19. 월 = id/2 + 1, 짝수 id 가 그 달 첫 장(1·3·8월 광, 나머지 열끗),
 * 홀수 id 가 둘째 장(8월은 열끗 기러기, 나머지 띠). 공용 화투 그림 번호는 toHwatuId.
 */

export const CARD_COUNT = 20;
export const monthOf = (id) => (id >> 1) + 1;
export const isGwang = (id) => id % 2 === 0 && [1, 3, 8].includes(monthOf(id));
/** 공용 HwatuCard(48장) 번호 */
export const toHwatuId = (id) => (id >> 1) * 4 + (id % 2);
const FIRST = (m) => (m - 1) * 2; // 그 달 첫 장(광 또는 열끗)

/** 2장 패의 기본 족보. base 가 클수록 세다 (특수패는 resolve 에서 상대에 따라 바뀜) */
export const classify = (a, b) => {
  const [x, y] = a < b ? [a, b] : [b, a];
  const m1 = monthOf(x);
  const m2 = monthOf(y);
  if (x === FIRST(3) && y === FIRST(8)) return { code: 'gwang38', base: 1000 };
  if (x === FIRST(1) && y === FIRST(3)) return { code: 'gwang13', base: 900 };
  if (x === FIRST(1) && y === FIRST(8)) return { code: 'gwang18', base: 900 };
  if (m1 === m2) return { code: 'ttaeng', month: m1, base: 700 + m1 * 10 };
  const named = { '1-2': ['ali', 600], '1-4': ['doksa', 590], '1-9': ['gubbing', 580], '1-10': ['jangbbing', 570], '4-10': ['jangsa', 560], '4-6': ['seryuk', 550] }[`${m1}-${m2}`];
  if (named) return { code: named[0], base: named[1] };
  const kkut = (m1 + m2) % 10;
  const hand = { code: 'kkut', kkut, base: 100 + kkut };
  if (x === FIRST(4) && y === FIRST(7)) hand.special = 'amhaeng';
  else if (x === FIRST(3) && y === FIRST(7)) hand.special = 'ttaengjabi';
  else if (m1 === 4 && m2 === 9) hand.special = x === FIRST(4) && y === FIRST(9) ? 'mgusa' : 'gusa';
  return hand;
};

const AMHAENG_ON = 950; // 13·18광땡을 잡음 (38광땡 아래)
const TTAENGJABI_ON = 795; // 1~9땡을 잡음 (장땡 아래)
const GUSA_LIMIT = 600; // 구사: 다른 사람 최고 패가 알리 이하면 재경기
const MGUSA_LIMIT = 790; // 멍텅구리구사: 9땡 이하면 재경기

/**
 * 승부 판정. entries: [{ seat, cards:[a,b] }] (승부에 남은 사람만)
 * @returns {{ redo: boolean, redoSeat: number|null, winners: number[], hands: Object<number,{...hand, strength, active}> }}
 *  winners 가 2명 이상이면 동점 (재경기는 호출한 쪽이 처리)
 */
export const resolve = (entries) => {
  const hands = entries.map((e) => ({ seat: e.seat, ...classify(e.cards[0], e.cards[1]) }));
  const othersMax = (i) => Math.max(...hands.filter((_, j) => j !== i).map((h) => h.base));
  const out = {};

  if (hands.length >= 2) {
    for (let i = 0; i < hands.length; i++) {
      const h = hands[i];
      const limit = h.special === 'gusa' ? GUSA_LIMIT : h.special === 'mgusa' ? MGUSA_LIMIT : null;
      if (limit != null && othersMax(i) <= limit) {
        hands.forEach((x) => { out[x.seat] = { ...x, strength: x.base, active: false }; });
        return { redo: true, redoSeat: h.seat, winners: [], hands: out };
      }
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

/** 3장에서 고를 수 있는 2장 조합 (cards 안 위치) */
export const PAIRS_OF_THREE = [[0, 1], [0, 2], [1, 2]];

/* ── 한 판 진행 (RULES.md §4~6) ──────────────────────────── */

const ceil10 = (n) => Math.ceil(n / 10) * 10;

export const shuffledDeck = (rng = Math.random) => {
  const d = Array.from({ length: CARD_COUNT }, (_, i) => i);
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
};

/** 선부터 시계 방향(자리 번호 순)으로 seats 를 정렬 */
const fromDealer = (n, dealer, seats) => [...seats].sort((a, b) => ((a - dealer + n) % n) - ((b - dealer + n) % n));
const liveSeats = (st) => st.players.map((_, i) => i).filter((i) => st.players[i].inHand && !st.players[i].folded);

/** 남은 사람에게 선부터 한 장씩 돌림 */
const dealRound = (st, count) => {
  const order = fromDealer(st.players.length, st.dealer, liveSeats(st));
  let dp = st.dp;
  const players = st.players.map((p) => ({ ...p, cards: [...p.cards] }));
  for (let k = 0; k < count; k++) {
    order.forEach((i) => { players[i].cards.push(st.deck[dp++]); });
  }
  return { ...st, players, dp };
};

const beginBetting = (st, round) => {
  const players = st.players.map((p) => (p.inHand && !p.folded ? { ...p, acted: false, canRaise: true } : p));
  const order = fromDealer(players.length, st.dealer, liveSeats(st));
  return { ...st, players, phase: 'bet', round, roundBet: false, turn: order[0], log: [...st.log, { type: 'round', round }] };
};

/**
 * 새 판.
 * @param players [{ id, name, chips }] 자리 순서 (참가자는 chips >= unit 이어야 함, 재경기는 0 도 가능)
 * @param dealer 선의 자리
 * @param mode 'two' | 'three'
 * @param redo 재경기면 { participants:[자리], carry } (학교 없음, 2장 방식)
 */
export const newHand = ({ players, dealer = 0, unit = 100, mode = 'two', redo = null, deck }) => {
  const parts = redo ? redo.participants : players.map((_, i) => i);
  const ante = redo ? 0 : unit;
  const ps = players.map((p, i) => {
    const inHand = parts.includes(i);
    return {
      id: p.id,
      name: p.name,
      chips: p.chips - (inHand ? ante : 0),
      contrib: inHand ? ante : 0,
      cards: [],
      inHand,
      folded: false,
      acted: false,
      canRaise: true,
      last: null,
      open: null, // 3장: 공개한 패의 번호(cards 안 위치)
      pick: null, // 3장: 승부에 쓸 2장의 위치
    };
  });
  // 선이 재경기에 없으면 선 다음 참가자부터
  const d = parts.includes(dealer) ? dealer : fromDealer(players.length, dealer, parts)[0];
  const playMode = redo ? 'two' : mode;
  let st = {
    mode,
    playMode,
    redo: !!redo,
    unit,
    cap: Math.min(...parts.map((i) => players[i].chips)),
    level: ante,
    pot: (redo ? redo.carry : 0) + ante * parts.length,
    dealer: d,
    turn: -1,
    phase: 'deal',
    round: 0,
    roundBet: false,
    deck: deck || shuffledDeck(),
    dp: 0,
    players: ps,
    log: [],
    result: null,
  };
  if (playMode === 'three') {
    st = dealRound(st, 2);
    return { ...st, phase: 'open' };
  }
  st = dealRound(st, 1);
  return beginBetting(st, 1);
};

/** 지금 무언가를 골라야 하는 자리 (3장: 공개할 패, 승부 패) */
export const pendingSeats = (st) => {
  if (st.phase === 'open') return liveSeats(st).filter((i) => st.players[i].open == null);
  if (st.phase === 'select') return liveSeats(st).filter((i) => st.players[i].pick == null);
  return [];
};

/** 베팅 차례인 자리에서 할 수 있는 행동 [{ type, pay }] (pay: 이번에 낼 포인트) */
export const legalActions = (st, seat) => {
  if (st.phase !== 'bet' || st.turn !== seat) return [];
  const p = st.players[seat];
  const toCall = st.level - p.contrib;
  const acts = [{ type: 'die', pay: 0 }];
  if (toCall === 0) acts.push({ type: 'check', pay: 0 });
  else acts.push({ type: 'call', pay: toCall });
  if (p.canRaise && st.level < st.cap) {
    const add = (type, level) => {
      const lv = Math.min(st.cap, level);
      if (lv > st.level) acts.push({ type, pay: lv - p.contrib });
    };
    if (!st.roundBet) add('bbing', st.level + st.unit);
    if (st.roundBet && toCall > 0) add('ddadang', st.level + toCall);
    add('quarter', st.level + ceil10((st.pot + toCall) / 4));
    add('half', st.level + ceil10((st.pot + toCall) / 2));
  }
  return acts;
};

export const RAISES = ['bbing', 'ddadang', 'quarter', 'half'];

/**
 * 행동 적용 → 새 상태. 할 수 없으면 Error('illegal_action')
 * action: 베팅은 'die' | 'check' | 'call' | 'bbing' | 'ddadang' | 'quarter' | 'half'
 *         3장 공개는 { type:'open', card: 0|1 }, 승부 패는 { type:'select', pick:[i, j] }
 */
export const applyAction = (st, seat, action) => {
  const type = typeof action === 'string' ? action : action?.type;
  if (type === 'open' || type === 'select') return choose(st, seat, type, action);
  const act = legalActions(st, seat).find((a) => a.type === type);
  if (!act) throw new Error('illegal_action');
  const players = st.players.map((p) => ({ ...p }));
  const p = players[seat];
  let { level, roundBet } = st;
  p.chips -= act.pay;
  p.contrib += act.pay;
  p.acted = true;
  p.last = type;
  if (type === 'die') p.folded = true;
  if (type === 'check' || type === 'call') p.canRaise = false;
  if (RAISES.includes(type)) {
    level = p.contrib;
    roundBet = true;
    players.forEach((o, i) => { if (i !== seat && o.inHand && !o.folded) o.acted = false; });
  }
  const next = { ...st, players, level, roundBet, pot: st.pot + act.pay, log: [...st.log, { seat, type, pay: act.pay }] };

  const alive = liveSeats(next);
  if (alive.length === 1) return finish(next);
  const n = players.length;
  for (let k = 1; k <= n; k++) {
    const i = (seat + k) % n;
    const o = players[i];
    if (o.inHand && !o.folded && (!o.acted || o.contrib < level)) return { ...next, turn: i };
  }
  return endRound(next);
};

const endRound = (st) => {
  if (st.round === 1) {
    return beginBetting(dealRound(st, 1), 2);
  }
  if (st.playMode === 'three') return { ...st, phase: 'select', turn: -1 };
  return finish(st);
};

const choose = (st, seat, type, action) => {
  if (st.phase !== type) throw new Error('illegal_action');
  if (!pendingSeats(st).includes(seat)) throw new Error('illegal_action');
  const players = st.players.map((p) => ({ ...p }));
  if (type === 'open') {
    if (action.card !== 0 && action.card !== 1) throw new Error('illegal_action');
    players[seat].open = action.card;
  } else {
    const pick = action.pick;
    const ok = Array.isArray(pick) && pick.length === 2 && pick.every((x) => Number.isInteger(x) && x >= 0 && x < 3) && pick[0] !== pick[1];
    if (!ok) throw new Error('illegal_action');
    players[seat].pick = [...pick].sort((a, b) => a - b);
  }
  const next = { ...st, players, log: [...st.log, { seat, type }] };
  if (pendingSeats(next).length > 0) return next;
  return type === 'open' ? beginBetting(next, 1) : finish(next);
};

/** 승부에 쓰는 2장 */
export const handCards = (p, playMode) => {
  if (playMode === 'three') return p.pick ? p.pick.map((k) => p.cards[k]) : null;
  return p.cards.length === 2 ? p.cards : null;
};

const finish = (st) => {
  const n = st.players.length;
  const players = st.players.map((p) => ({ ...p }));
  const alive = liveSeats(st);
  const payouts = {};
  let result;
  if (alive.length === 1) {
    payouts[alive[0]] = st.pot;
    result = { type: 'fold', reason: 'fold', winners: alive, participants: [], payouts, reveal: [], hands: {}, redoSeat: null, nextDealer: alive[0], carry: 0 };
  } else {
    const order = fromDealer(n, st.dealer, alive);
    const r = resolve(order.map((i) => ({ seat: i, cards: handCards(players[i], st.playMode) })));
    if (r.redo) {
      result = { type: 'redo', reason: r.hands[r.redoSeat].special, winners: [], participants: order, payouts, reveal: order, hands: r.hands, redoSeat: r.redoSeat, nextDealer: st.dealer, carry: st.pot };
    } else if (r.winners.length > 1) {
      const tied = fromDealer(n, st.dealer, r.winners);
      result = { type: 'redo', reason: 'tie', winners: [], participants: tied, payouts, reveal: order, hands: r.hands, redoSeat: null, nextDealer: st.dealer, carry: st.pot };
    } else {
      payouts[r.winners[0]] = st.pot;
      result = { type: 'showdown', reason: 'showdown', winners: r.winners, participants: [], payouts, reveal: order, hands: r.hands, redoSeat: null, nextDealer: r.winners[0], carry: 0 };
    }
  }
  Object.entries(payouts).forEach(([i, v]) => { players[i].chips += v; });
  return { ...st, players, phase: 'done', turn: -1, result };
};

/** 다음 판 시작 값: 재경기면 참가자·이월 판돈을 넘긴다 */
export const nextHandArgs = (st) => ({
  players: st.players.map((p) => ({ id: p.id, name: p.name, chips: p.chips })),
  dealer: st.result.nextDealer,
  unit: st.unit,
  mode: st.mode,
  redo: st.result.type === 'redo' ? { participants: st.result.participants, carry: st.result.carry } : null,
});

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
