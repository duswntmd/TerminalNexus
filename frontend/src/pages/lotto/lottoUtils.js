// 로또 6/45 공용 계산 (번호 생성·등수 판정·통계)
import { fetchWithAccessRaw } from '../../util/fetchUtil';

export const BALL_COLORS = ['#f9ca24', '#3b82f6', '#ef4444', '#71717a', '#22c55e'];

/** 동행복권 공 색상 구간: 1~10 노랑, 11~20 파랑, 21~30 빨강, 31~40 회색, 41~45 초록 */
export const ballColor = (n) => BALL_COLORS[Math.min(4, Math.floor((n - 1) / 10))];

/** 0 이상 max 미만의 균등한 정수 (crypto 난수 + 거절 샘플링으로 치우침 없음) */
const randomInt = (max) => {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let x;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
};

/**
 * 1~45 중 6개를 고르게 뽑음 (부분 Fisher–Yates)
 * fixed: 반드시 포함할 번호, excluded: 제외할 번호
 */
export const pickNumbers = ({ fixed = [], excluded = [] } = {}) => {
  const pool = [];
  for (let n = 1; n <= 45; n++) {
    if (!fixed.includes(n) && !excluded.includes(n)) pool.push(n);
  }
  const need = 6 - fixed.length;
  for (let i = 0; i < need; i++) {
    const j = i + randomInt(pool.length - i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return [...fixed, ...pool.slice(0, need)].sort((a, b) => a - b);
};

/** 등수 (1~5), 낙첨이면 0 */
export const rankOf = (mine, draw) => {
  const hit = mine.filter((n) => draw.numbers.includes(n)).length;
  if (hit === 6) return 1;
  if (hit === 5) return mine.includes(draw.bonus) ? 2 : 3;
  if (hit === 4) return 4;
  if (hit === 3) return 5;
  return 0;
};

/** 내 번호를 전 회차와 비교: 등수별 횟수와 높은 등수 기록 */
export const checkAgainstHistory = (mine, draws) => {
  const counts = [0, 0, 0, 0, 0, 0];
  const hits = [];
  for (const d of draws) {
    const r = rankOf(mine, d);
    counts[r] += 1;
    if (r >= 1 && r <= 4) hits.push({ ...d, rank: r });
  }
  hits.sort((a, b) => a.rank - b.rank || b.no - a.no);
  return { counts, hits };
};

/** 번호별 출현 횟수와 마지막 출현 이후 지난 회차 수 */
export const numberStats = (draws, { includeBonus = false } = {}) => {
  const stats = Array.from({ length: 46 }, (_, n) => ({ n, count: 0, lastNo: null }));
  for (const d of draws) {
    const nums = includeBonus ? [...d.numbers, d.bonus] : d.numbers;
    for (const n of nums) {
      stats[n].count += 1;
      if (stats[n].lastNo === null || d.no > stats[n].lastNo) stats[n].lastNo = d.no;
    }
  }
  const latestNo = draws.length ? draws[0].no : 0;
  return stats.slice(1).map((s) => ({ ...s, gap: s.lastNo === null ? null : latestNo - s.lastNo }));
};

export const formatWon = (v, lang) => {
  if (v == null) return '-';
  if (lang === 'ko') {
    if (v >= 100_000_000) {
      const eok = Math.floor(v / 100_000_000);
      const man = Math.floor((v % 100_000_000) / 10_000);
      return man ? `${eok.toLocaleString()}억 ${man.toLocaleString()}만원` : `${eok.toLocaleString()}억원`;
    }
    return `${v.toLocaleString()}원`;
  }
  return `₩${v.toLocaleString('en-US')}`;
};

/** 서버에 번호 저장. 성공하면 null, 실패하면 안내 문구 */
export const saveTicket = async (numbers, label, t) => {
  try {
    const res = await fetchWithAccessRaw('/api/lotto/my/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numbers, label }),
    });
    if (res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return data.message || t('lotto.my_save_failed');
  } catch {
    return t('lotto.my_save_failed');
  }
};
