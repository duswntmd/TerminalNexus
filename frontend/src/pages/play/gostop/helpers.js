import { CARDS, GWANG, YEOL, TTI } from '../../../components/hwatu/cards.js';
import { GUKJIN_ID, scoreOf } from './engine.js';

/** 먹은 패를 광·열끗·띠·피로 나눈다 (국진은 설정에 따라 열끗/피) */
export const groupCaptured = (captured, gukjin) => {
  const asPi = (gukjin ?? scoreOf(captured).gukjin) === 'pi';
  const g = { gwang: [], yeol: [], tti: [], pi: [] };
  for (const id of captured) {
    const c = CARDS[id];
    if (c.kind === GWANG) g.gwang.push(id);
    else if (c.kind === YEOL && !(asPi && id === GUKJIN_ID)) g.yeol.push(id);
    else if (c.kind === TTI) g.tti.push(id);
    else g.pi.push(id);
  }
  Object.values(g).forEach((list) => list.sort((a, b) => a - b));
  return g;
};

/** 이벤트 목록 → 알림 문구 */
const TONE = { ppeok: 'bad', jjok: 'good', ttadak: 'good', sweep: 'good', bomb: 'hot', shake: 'hot', go: 'hot', stop: 'good', eatppeok: 'good', jappeok: 'good', chongtong: 'hot', nagari: 'bad' };
export const bannerFromEvents = (events, t, names, me) => {
  const shown = events.filter((e) => TONE[e.type]);
  if (!shown.length) {
    const st = events.find((e) => e.type === 'steal');
    if (!st) return null;
    return { text: t(st.player === me ? 'gostop.events.steal_got' : 'gostop.events.steal_lost', { n: st.count }), tone: st.player === me ? 'good' : 'bad', key: Date.now() };
  }
  const e = shown[shown.length - 1];
  let text = e.type === 'go' ? t('gostop.events.go', { n: e.count }) : t(`gostop.events.${e.type}`);
  if (e.player !== undefined && names) text = `${names[e.player]} · ${text}`;
  const st = events.find((x) => x.type === 'steal');
  if (st) text += ` (${t(st.player === me ? 'gostop.events.steal_got' : 'gostop.events.steal_lost', { n: st.count })})`;
  return { text, tone: TONE[e.type], key: Date.now() };
};
