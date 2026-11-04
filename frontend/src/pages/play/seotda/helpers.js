import { handLabel, legalActions } from './engine.js';

export const ANTE = 100;
export const START_POINTS = 10000;

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

/** 내 패 설명 (특수패면 조건) */
export const handHint = (t, hand) => (hand?.special ? t(`seotda.special_hint.${hand.special}`) : '');

/** 결과 제목 키: 나를 기준으로 (관전이면 null 자리) */
export const resultTitleKey = (result, mySeat) => {
  if (result.type === 'redo') return 'redo';
  if (mySeat == null || mySeat < 0) return null;
  if (!result.winners.includes(mySeat)) return 'lose';
  return result.winners.length > 1 ? 'tie' : 'win';
};

/** 서버 공개 상태로 엔진 상태 모양을 만들어 내가 할 수 있는 행동을 계산 */
export const onlineActions = (room, mySeat) => {
  if (!room || room.status !== 'PLAYING' || mySeat < 0) return [];
  const st = {
    phase: 'betting',
    ante: room.ante,
    cap: room.cap,
    level: room.level,
    pot: room.pot,
    turn: room.turn,
    players: room.seats.map((s) => ({ contrib: s.contrib, raised: s.raised, folded: s.folded })),
  };
  return legalActions(st, mySeat);
};

/** 행동 기록 한 줄 */
export const logLine = (t, entry, names) => (entry.pay > 0
  ? t('seotda.log.act_pay', { name: names[entry.seat], act: t(`seotda.acts.${entry.type}`), pay: fmt(entry.pay) })
  : t('seotda.log.act', { name: names[entry.seat], act: t(`seotda.acts.${entry.type}`) }));
