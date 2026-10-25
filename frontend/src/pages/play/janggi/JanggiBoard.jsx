import React from 'react';
import { CHO, HAN, KING, GUARD, PAWN, PIECE_CHAR, PIECE_NAME, typeOf, teamOf } from './engine.js';

const O = 40;   // 판 여백
const C = 60;   // 칸 간격
const W = O * 2 + C * 8;
const H = O * 2 + C * 9;

const TEAM_COLOR = { [CHO]: '#15803d', [HAN]: '#dc2626' };

// 팔각형 꼭짓점
const octagon = (cx, cy, r) => Array.from({ length: 8 }, (_, k) => {
  const a = (Math.PI / 8) + (k * Math.PI) / 4;
  return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
}).join(' ');

const radiusOf = (type) => (type === KING ? 27 : type === GUARD || type === PAWN ? 19 : 23);

/**
 * 장기판 (SVG)
 * @param board     길이 90 배열
 * @param flipped   한 시점(위아래·좌우 반전)으로 표시
 * @param selected  선택한 칸
 * @param targets   이동 가능한 칸 목록
 * @param lastMove  [from, to]
 * @param checkSq   장군 받은 궁의 칸
 * @param onSquare  칸 클릭 콜백(idx)
 */
const JanggiBoard = ({ board, flipped = false, selected = null, targets = [], lastMove = null, checkSq = null, onSquare, disabled = false }) => {
  // 판 좌표(idx) → 화면 좌표
  const pos = (i) => {
    let x = i % 9;
    let y = Math.floor(i / 9);
    if (flipped) { x = 8 - x; y = 9 - y; }
    return { cx: O + x * C, cy: O + y * C };
  };
  const line = (x1, y1, x2, y2, key) => (
    <line key={key} x1={O + x1 * C} y1={O + y1 * C} x2={O + x2 * C} y2={O + y2 * C} />
  );
  const targetSet = new Set(targets);

  return (
    <svg className={`janggi-board${disabled ? ' is-disabled' : ''}`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="장기판">
      <defs>
        <linearGradient id="jg-wood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0d29b" />
          <stop offset="100%" stopColor="#dcb173" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} rx="14" fill="url(#jg-wood)" />

      <g className="janggi-lines">
        {Array.from({ length: 10 }, (_, y) => line(0, y, 8, y, `h${y}`))}
        {Array.from({ length: 9 }, (_, x) => line(x, 0, x, 9, `v${x}`))}
        {line(3, 0, 5, 2, 'p1')}{line(5, 0, 3, 2, 'p2')}
        {line(3, 7, 5, 9, 'p3')}{line(5, 7, 3, 9, 'p4')}
      </g>

      {/* 직전 수 표시 */}
      {lastMove && lastMove[0] >= 0 && [lastMove[0], lastMove[1]].map((i, k) => {
        const { cx, cy } = pos(i);
        return <circle key={`lm${k}`} cx={cx} cy={cy} r={k === 0 ? 10 : 30} className={k === 0 ? 'jg-last-from' : 'jg-last-to'} />;
      })}

      {/* 장군 표시 */}
      {checkSq != null && checkSq >= 0 && (() => {
        const { cx, cy } = pos(checkSq);
        return <circle cx={cx} cy={cy} r="33" className="jg-check" />;
      })()}

      {/* 기물 */}
      {board.map((p, i) => {
        if (!p) return null;
        const { cx, cy } = pos(i);
        const type = typeOf(p);
        const team = teamOf(p);
        const r = radiusOf(type);
        const isSel = selected === i;
        return (
          <g key={`p${i}`} className={`jg-piece${isSel ? ' is-selected' : ''}${targetSet.has(i) ? ' is-target' : ''}`}>
            <title>{`${team === CHO ? '초' : '한'} ${PIECE_NAME[type]}`}</title>
            <polygon points={octagon(cx, cy + 2, r)} className="jg-piece-shadow" />
            <polygon points={octagon(cx, cy, r)} fill="#fdf7e8" stroke={TEAM_COLOR[team]} strokeWidth={isSel ? 4 : 2.5} />
            <text x={cx} y={cy + 1} fill={TEAM_COLOR[team]} fontSize={r * 1.12} textAnchor="middle" dominantBaseline="central">
              {PIECE_CHAR[team][type]}
            </text>
          </g>
        );
      })}

      {/* 이동 가능 칸 */}
      {targets.map((i) => {
        const { cx, cy } = pos(i);
        return board[i]
          ? <circle key={`t${i}`} cx={cx} cy={cy} r="30" className="jg-target-capture" />
          : <circle key={`t${i}`} cx={cx} cy={cy} r="9" className="jg-target" />;
      })}

      {/* 클릭 영역 */}
      {!disabled && board.map((_, i) => {
        const { cx, cy } = pos(i);
        return <circle key={`c${i}`} cx={cx} cy={cy} r="29" className="jg-hit" onClick={() => onSquare?.(i)} />;
      })}
    </svg>
  );
};

export default JanggiBoard;
