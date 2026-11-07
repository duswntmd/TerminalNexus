/* 섯다 AI: 자기 패, 남이 공개한 패(3장 섯다), 공개된 베팅만 보고 판단한다 (상대가 숨긴 패는 보지 않음) */
import { CARD_COUNT, isGwang, monthOf, resolve, legalActions, PAIRS_OF_THREE, RAISES } from './engine.js';

const pairKey = (a, b) => (a < b ? a * CARD_COUNT + b : b * CARD_COUNT + a);

/**
 * 2장 패 → 남은 18장에서 나올 수 있는 상대 패 153가지와 1:1로 붙였을 때의 기대 승률.
 * 무승부·재경기는 반으로 센다. 처음 한 번만 계산(190 × 153)
 */
let EQUITY = null;
export const equityOf = (a, b) => {
  if (!EQUITY) {
    EQUITY = new Map();
    for (let x = 0; x < CARD_COUNT; x++) {
      for (let y = x + 1; y < CARD_COUNT; y++) {
        let score = 0;
        let total = 0;
        for (let p = 0; p < CARD_COUNT; p++) {
          if (p === x || p === y) continue;
          for (let q = p + 1; q < CARD_COUNT; q++) {
            if (q === x || q === y) continue;
            const r = resolve([{ seat: 0, cards: [x, y] }, { seat: 1, cards: [p, q] }]);
            total++;
            if (r.redo || r.winners.length === 2) score += 0.5;
            else if (r.winners[0] === 0) score += 1;
          }
        }
        EQUITY.set(pairKey(x, y), score / total);
      }
    }
  }
  return EQUITY.get(pairKey(a, b));
};

/** 3장 중 승부에 쓸 2장의 위치 (1:1 승률이 가장 높은 조합) */
export const bestPick = (cards) => {
  let best = PAIRS_OF_THREE[0];
  let bestEq = -1;
  for (const pr of PAIRS_OF_THREE) {
    const eq = equityOf(cards[pr[0]], cards[pr[1]]);
    if (eq > bestEq) { bestEq = eq; best = pr; }
  }
  return best;
};

/** 3장 섯다: 2장 중 공개할 패 (족보에 쓸모가 큰 패를 숨긴다) */
export const decideOpen = (st, seat, rng = Math.random) => {
  const [a, b] = st.players[seat].cards;
  const worth = (c) => (isGwang(c) ? 3 : [1, 4, 9, 10].includes(monthOf(c)) ? 2 : 1);
  if (worth(a) === worth(b)) return rng() < 0.5 ? 0 : 1;
  return worth(a) < worth(b) ? 0 : 1;
};

export const decideSelect = (st, seat) => bestPick(st.players[seat].cards);

/**
 * 몬테카를로 승률: 보이지 않는 카드(내 다음 카드, 상대가 숨긴 패)를 무작위로 채워 판정해 본다.
 * 무승부·재경기는 몫만큼 센다.
 */
export const estimateEquity = (st, seat, samples = 200, rng = Math.random) => {
  const me = st.players[seat];
  const finalCount = st.playMode === 'three' ? 3 : 2;
  const opponents = st.players.map((p, i) => i).filter((i) => i !== seat && st.players[i].inHand && !st.players[i].folded);
  if (opponents.length === 0) return 1;
  const known = new Set(me.cards);
  const publicOf = (i) => {
    const p = st.players[i];
    return p.open != null ? [p.cards[p.open]] : [];
  };
  opponents.forEach((i) => publicOf(i).forEach((c) => known.add(c)));
  const pool = Array.from({ length: CARD_COUNT }, (_, i) => i).filter((c) => !known.has(c));

  const pairOf = (cards, fixedPick) => {
    if (cards.length === 2) return cards;
    const pk = fixedPick || bestPick(cards);
    return [cards[pk[0]], cards[pk[1]]];
  };

  let score = 0;
  for (let s = 0; s < samples; s++) {
    // 부분 셔플로 필요한 만큼만 뽑기
    const deck = pool.slice();
    let k = 0;
    const draw = () => {
      const j = k + Math.floor(rng() * (deck.length - k));
      [deck[k], deck[j]] = [deck[j], deck[k]];
      return deck[k++];
    };
    const mine = [...me.cards];
    while (mine.length < finalCount) mine.push(draw());
    const entries = [{ seat, cards: pairOf(mine, mine.length === me.cards.length ? me.pick : null) }];
    for (const i of opponents) {
      const cards = publicOf(i);
      while (cards.length < finalCount) cards.push(draw());
      entries.push({ seat: i, cards: pairOf(cards) });
    }
    const r = resolve(entries);
    if (r.redo) score += 1 / entries.length;
    else if (r.winners.includes(seat)) score += 1 / r.winners.length;
  }
  return score / samples;
};

export const LEVELS = {
  // samples: 계산량, noise: 판단 흔들림, margin: 콜에 필요한 여유, raise: 올리는 기준,
  // bluff: 약한 패로 올릴 확률, read: 상대 올리기를 경계하는 정도, looseCall: 아무 패로 따라가는 확률
  easy: { samples: 60, noise: 0.2, margin: -0.06, raise: 0.8, bluff: 0.02, read: 0, looseCall: 0.4 },
  normal: { samples: 200, noise: 0.07, margin: 0.02, raise: 0.62, bluff: 0.05, read: 0.1, looseCall: 0.08 },
  // hard: 2인 자동 대전(10,000P, 5,000경기)에서 2장·3장 모두 normal 보다 앞서도록 맞춘 값
  hard: { samples: 400, noise: 0.02, margin: 0.02, raise: 0.68, bluff: 0.03, read: 0.1, looseCall: 0.08 },
};

/** 베팅 행동 하나 → 'die' | 'check' | 'call' | 'bbing' | 'ddadang' | 'quarter' | 'half' */
export const decide = (st, seat, level = 'normal', rng = Math.random) => {
  const cfg = LEVELS[level] || LEVELS.normal;
  const acts = legalActions(st, seat);
  const has = (t) => acts.some((a) => a.type === t);
  const raisesByOthers = st.log.filter((l) => l.seat !== seat && RAISES.includes(l.type)).length;
  let eq = estimateEquity(st, seat, cfg.samples, rng);
  eq *= Math.pow(1 - cfg.read, raisesByOthers);
  eq = Math.min(1, Math.max(0, eq + (rng() * 2 - 1) * cfg.noise));

  const call = acts.find((a) => a.type === 'call');
  const toCall = call ? call.pay : 0;
  const potOdds = toCall / (st.pot + toCall);

  const raise = () => {
    const strong = eq > cfg.raise + 0.2;
    const order = strong ? ['half', 'ddadang', 'quarter', 'bbing'] : ['bbing', 'quarter', 'ddadang', 'half'];
    return order.find(has) || null;
  };

  if (eq > cfg.raise || rng() < cfg.bluff) {
    const r = raise();
    if (r) return r;
  }
  if (toCall === 0) return 'check';
  if (eq >= potOdds + cfg.margin || rng() < cfg.looseCall) return 'call';
  return 'die';
};

/** 지금 해야 할 AI 행동 (베팅·공개·패 고르기) */
export const aiAction = (st, seat, level, rng = Math.random) => {
  if (st.phase === 'open') return { type: 'open', card: decideOpen(st, seat, rng) };
  if (st.phase === 'select') return { type: 'select', pick: decideSelect(st, seat) };
  return decide(st, seat, level, rng);
};
