import { classify, resolve, handLabel, legalActions, monthOf, PAIRS_OF_THREE } from './engine.js';
import { bestPick } from './ai.js';

export const UNIT = 100;
export const START_POINTS = 10000;
export const REVEAL_GAP = 700; // 승부 때 한 사람씩 패를 뒤집는 간격 (ms)

export const fmt = (n) => Number(n || 0).toLocaleString();

/** 족보 이름 (특수패는 이름만) */
export const handName = (t, hand) => {
  const l = handLabel(hand);
  return l ? t(`seotda.hands.${l.key}`, { n: l.n }) : '';
};

/** 승부 결과용 이름: 특수패가 살았는지, 아니면 몇 끗으로 계산됐는지 덧붙임 */
export const handResult = (t, hand, redo = false) => {
  const name = handName(t, hand);
  if (!hand.special || redo) return name;
  return `${name} · ${hand.active ? t('seotda.special_on') : t('seotda.special_as', { n: hand.kkut })}`;
};

/** 내 패 설명: 1장이면 월, 2장이면 족보, 3장이면 고른 2장 또는 가장 좋은 2장 */
export const myHandText = (t, cards, pick) => {
  if (!cards || cards.length === 0) return '';
  if (cards.length === 1) return t('seotda.month_card', { n: monthOf(cards[0]) });
  if (cards.length === 2) return handName(t, classify(cards[0], cards[1]));
  const pk = pick || bestPick(cards);
  const name = handName(t, classify(cards[pk[0]], cards[pk[1]]));
  return pick ? name : t('seotda.best_now', { name });
};

/** 특수패 조건 안내 */
export const handHint = (t, cards) => {
  if (!cards || cards.length !== 2) return '';
  const h = classify(cards[0], cards[1]);
  return h.special ? t(`seotda.special_hint.${h.special}`) : '';
};

/** 3장 섯다 패 고르기 선택지 */
export const selectOptions = (t, cards) => {
  const best = bestPick(cards).join();
  return PAIRS_OF_THREE.map((pk) => ({
    pick: pk,
    cards: [cards[pk[0]], cards[pk[1]]],
    name: handName(t, classify(cards[pk[0]], cards[pk[1]])),
    best: pk.join() === best,
  }));
};

/**
 * 한 자리의 카드 표시
 * @param cards 알고 있는 카드 (내 패, 승부 공개 패) 또는 null
 * @param count 받은 장수
 * @param openCard 3장: 스스로 공개한 카드
 * @param pick 승부에 쓴 2장의 위치 (공개 뒤)
 * @param revealed 승부 공개 중인지
 */
export const seatCards = ({ cards, count, openCard = null, openIndex = null, pick = null, revealed = false, mine = false, tag }) => {
  if (cards) {
    return cards.map((id, k) => ({
      id,
      up: true,
      revealed: revealed && !mine,
      picked: !!pick && pick.includes(k),
      dim: !!pick && !pick.includes(k),
      tag: openIndex === k ? tag : undefined,
    }));
  }
  const out = [];
  if (openCard != null) out.push({ id: openCard, up: true });
  while (out.length < count) out.push({ id: null, up: false });
  return out;
};

/** 결과 제목 키 (나를 기준, 관전이면 null) */
export const resultTitleKey = (result, mySeat) => {
  if (result.type === 'redo') return 'redo';
  if (mySeat == null || mySeat < 0) return null;
  return result.winners.includes(mySeat) ? 'win' : 'lose';
};

/** 결과 설명 줄 */
export const resultLines = (t, result, hands, names, carry) => {
  if (result.type === 'fold') return [t('seotda.result.fold_desc', { name: names[result.winners[0]] })];
  if (result.type === 'redo') {
    if (result.reason === 'tie') {
      const h = hands[result.participants[0]];
      return [t('seotda.result.tie_desc', { names: result.participants.map((i) => names[i]).join(', '), hand: h ? handName(t, h) : '', pot: fmt(carry) })];
    }
    const h = hands[result.redoSeat];
    return [t('seotda.result.redo_desc', { name: names[result.redoSeat], hand: h ? handName(t, h) : '', pot: fmt(carry), names: result.participants.map((i) => names[i]).join(', ') })];
  }
  const w = result.winners[0];
  return [t('seotda.result.winner', { name: names[w], hand: hands[w] ? handResult(t, hands[w]) : '' })];
};

/** 결과 때 판 가운데 크게 띄우는 글 { title, sub, tone: win | lose | redo } */
export const resultBanner = (t, result, hands, names, mySeat) => {
  if (result.type === 'redo') {
    if (result.reason === 'tie') {
      const h = hands[result.participants[0]];
      return { title: t('seotda.banner.tie'), sub: h ? handName(t, h) : '', tone: 'redo' };
    }
    const h = hands[result.redoSeat];
    return { title: t('seotda.banner.redo', { hand: h ? handName(t, h) : '' }), sub: names[result.redoSeat], tone: 'redo' };
  }
  const w = result.winners[0];
  const tone = w === mySeat ? 'win' : mySeat >= 0 ? 'lose' : 'win';
  if (result.type === 'fold') return { title: t('seotda.banner.win_by', { name: names[w] }), sub: t('seotda.banner.fold'), tone };
  const h = hands[w];
  return { title: `${h ? handName(t, h) : ''}!`, sub: t('seotda.banner.win_by', { name: names[w] }), tone };
};

/** 서버 공개 상태 → 승부 판정 (공개된 패로 화면에서 다시 계산, 서버와 같은 규칙) */
export const resolveRevealed = (room) => {
  const res = room.result;
  if (!res || !res.reveal || res.reveal.length < 2) return null;
  const entries = res.reveal.map((i) => {
    const s = room.seats[i];
    const cards = s.pick ? s.pick.map((k) => s.cards[k]) : s.cards;
    return { seat: i, cards };
  });
  if (entries.some((e) => !e.cards || e.cards.length !== 2)) return null;
  return resolve(entries);
};

/** 서버 공개 상태로 엔진 상태 모양을 만들어 내가 할 수 있는 행동을 계산 */
export const onlineActions = (room, mySeat) => {
  if (!room || room.status !== 'PLAYING' || room.phase !== 'bet' || mySeat < 0) return [];
  const st = {
    phase: 'bet',
    unit: room.unit,
    cap: room.cap,
    level: room.level,
    pot: room.pot,
    turn: room.turn,
    roundBet: room.roundBet,
    players: room.seats.map((s) => ({ contrib: s.contrib, canRaise: s.canRaise, folded: s.folded, inHand: s.inHand })),
  };
  return legalActions(st, mySeat);
};

/** 행동 기록 한 줄 */
export const logLine = (t, entry, names) => {
  if (entry.type === 'round') return t('seotda.log.round', { n: entry.round });
  if (entry.type === 'open') return t('seotda.log.open', { name: names[entry.seat] });
  if (entry.type === 'select') return t('seotda.log.select', { name: names[entry.seat] });
  return entry.pay > 0
    ? t('seotda.log.act_pay', { name: names[entry.seat], act: t(`seotda.acts.${entry.type}`), pay: fmt(entry.pay) })
    : t('seotda.log.act', { name: names[entry.seat], act: t(`seotda.acts.${entry.type}`) });
};
