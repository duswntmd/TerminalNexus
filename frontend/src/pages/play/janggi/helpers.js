import { useMemo } from 'react';
import { CHO, HAN, PASS, createBoard, applyToBoard, notation } from './engine.js';

export const TEAM_LABEL = { [CHO]: '초(楚)', [HAN]: '한(漢)' };

/** 상차림 + 기보로 각 수 직전 판을 재구성해 기보 표기 생성 */
export const useNotations = (choFormation, hanFormation, moves) => useMemo(() => {
  let b = createBoard(choFormation, hanFormation);
  return moves.map(([from, to, cap], i) => {
    const mover = i % 2 === 0 ? CHO : HAN;
    const captured = cap ?? (from === PASS ? 0 : b[to]);
    const text = notation([from, to, captured], mover, b);
    b = applyToBoard(b, from, to);
    return text;
  });
}, [choFormation, hanFormation, moves]);

/** 진영별 잡은 기물 */
export const capturedBy = (choFormation, hanFormation, moves) => {
  const res = { [CHO]: [], [HAN]: [] };
  let b = createBoard(choFormation, hanFormation);
  moves.forEach(([from, to], i) => {
    if (from !== PASS && b[to]) res[i % 2 === 0 ? CHO : HAN].push(b[to]);
    b = applyToBoard(b, from, to);
  });
  return res;
};
