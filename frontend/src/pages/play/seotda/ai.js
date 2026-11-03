/* 섯다 AI: 자기 패와 공개된 베팅 상황만 보고 판단한다 (상대 패는 보지 않음) */
import { CARD_COUNT, resolve, legalActions } from './engine.js';

const pairKey = (a, b) => (a < b ? a * CARD_COUNT + b : b * CARD_COUNT + a);

/**
 * 내 패 → 남은 18장에서 나올 수 있는 상대 패 153가지와 1:1로 붙였을 때의 기대 승률.
 * 무승부와 구사 재경기는 반으로 센다. 처음 한 번만 계산(190 × 153)
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
            if (r.redo) score += 0.5;
            else if (r.winners.length === 2) score += 0.5;
            else if (r.winners[0] === 0) score += 1;
          }
        }
        EQUITY.set(pairKey(x, y), score / total);
      }
    }
  }
  return EQUITY.get(pairKey(a, b));
};

export const LEVELS = {
  // noise: 판단 흔들림, margin: 콜에 필요한 여유, raise: 올리는 기준, bluff: 약한 패로 올릴 확률, read: 상대 올리기를 경계하는 정도
  easy: { noise: 0.22, margin: -0.08, raise: 0.86, bluff: 0, read: 0, looseCall: 0.45 },
  normal: { noise: 0.08, margin: 0.02, raise: 0.74, bluff: 0.04, read: 0.12, looseCall: 0.1 },
  hard: { noise: 0.03, margin: 0.04, raise: 0.68, bluff: 0.09, read: 0.2, looseCall: 0 },
};

/** AI 행동 하나를 고른다 → 'die' | 'check' | 'call' | 'bbing' | 'half' */
export const decide = (st, seat, level = 'normal', rng = Math.random) => {
  const cfg = LEVELS[level] || LEVELS.normal;
  const acts = legalActions(st, seat);
  const has = (t) => acts.some((a) => a.type === t);
  const me = st.players[seat];
  const opponents = st.players.filter((p, i) => i !== seat && !p.folded).length;

  // 상대가 여럿이면 모두를 이겨야 하므로 승률을 거듭제곱. 상대가 올렸으면 강한 패로 보고 깎는다
  const raisesByOthers = st.log.filter((l) => l.seat !== seat && (l.type === 'bbing' || l.type === 'half')).length;
  let eq = equityOf(me.cards[0], me.cards[1]);
  eq = Math.pow(eq, level === 'easy' ? 1 : opponents);
  eq *= Math.pow(1 - cfg.read, raisesByOthers);
  eq = Math.min(1, Math.max(0, eq + (rng() * 2 - 1) * cfg.noise));

  const call = acts.find((a) => a.type === 'call');
  const toCall = call ? call.pay : 0;
  const potOdds = toCall / (st.pot + toCall);

  const raise = () => {
    if (has('half') && (eq > cfg.raise + 0.1 || !has('bbing'))) return 'half';
    if (has('bbing')) return 'bbing';
    return has('half') ? 'half' : null;
  };

  if (eq > cfg.raise || rng() < cfg.bluff) {
    const r = raise();
    if (r) return r;
  }
  if (toCall === 0) return 'check';
  if (eq >= potOdds + cfg.margin || rng() < cfg.looseCall) return 'call';
  return 'die';
};
