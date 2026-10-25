/* 모의 주식 공통 규칙·표시 (서버 StockRules.java 와 동일) */

export const FEE_RATE = 0.00015; // 수수료 0.015%
export const TAX_RATE = 0.0018;  // 매도 거래세 0.18%

export const tickSize = (p) => (
  p < 2000 ? 1 : p < 5000 ? 5 : p < 20000 ? 10 : p < 50000 ? 50 : p < 200000 ? 100 : p < 500000 ? 500 : 1000
);
export const tickUp = (p) => p + tickSize(p);
export const tickDown = (p) => Math.max(1, p - tickSize(p - 1));
export const floorToTick = (p) => Math.max(1, Math.floor(p / tickSize(p)) * tickSize(p));

export const fee = (amount) => Math.floor(amount * FEE_RATE);
export const tax = (amount) => Math.floor(amount * TAX_RATE);

export const fmt = (n) => (n == null || Number.isNaN(n) ? '-' : Math.round(n).toLocaleString('ko-KR'));

/** 큰 금액 축약: 1.2조 / 3,450억 / 1.2만 */
export const fmtBig = (n) => {
  if (n == null) return '-';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)}조`;
  if (abs >= 1e8) return `${Math.round(n / 1e8).toLocaleString('ko-KR')}억`;
  if (abs >= 1e4) return `${(n / 1e4).toFixed(1)}만`;
  return fmt(n);
};

/** 등락 색: 상승 빨강, 하락 파랑 (한국 증권 관례) */
export const tone = (diff) => (diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat');
export const arrow = (diff) => (diff > 0 ? '▲' : diff < 0 ? '▼' : '');
export const signed = (n) => `${n > 0 ? '+' : ''}${fmt(n)}`;
export const pct = (r) => `${r > 0 ? '+' : ''}${Number(r).toFixed(2)}%`;

/** 로그인 토큰이 있으면 붙여서 조회 (실패해도 로그인 페이지로 보내지 않음) */
export const getJson = async (url) => {
  const token = localStorage.getItem('accessToken');
  let res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  // 만료된 토큰이면 공개 데이터라도 401 → 토큰 없이 다시 조회
  if (res.status === 401 && token) res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};
