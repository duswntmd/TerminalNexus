// AI 대전 가상 포인트 (이 브라우저에만 저장, 현금 가치 없음)
export const START_POINTS = 10000;
export const POINT_PER_SCORE = 100;
const KEY = 'tn.gostop.points';

export const loadPoints = () => {
  try {
    const n = Number(localStorage.getItem(KEY));
    return Number.isFinite(n) && n > 0 ? n : START_POINTS;
  } catch {
    return START_POINTS;
  }
};

export const savePoints = (n) => {
  try { localStorage.setItem(KEY, String(n)); } catch { /* 저장 불가 환경은 무시 */ }
};

/** 판 결과 반영. 다 잃으면 다시 채운다. 반환: { points, delta, refilled } */
export const applyResult = (points, delta) => {
  const next = Math.max(0, points + delta);
  const real = next - points;
  if (next <= 0) return { points: START_POINTS, delta: real, refilled: true };
  return { points: next, delta: real, refilled: false };
};
