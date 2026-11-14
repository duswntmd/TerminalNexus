import React, { useMemo, useRef, useState } from 'react';
import { SIZE, BLACK, xOf, yOf, toIdx, coordOf } from './engine.js';

// SVG 좌표: 줄 간격 40, 가장자리 여백 36 (좌표 글자 자리)
const CELL = 40;
const PAD = 36;
const SPAN = CELL * (SIZE - 1);
const VIEW = SPAN + PAD * 2;
const R = 18.2; // 돌 반지름
const px = (i) => PAD + i * CELL;
const STARS = [[3, 3], [11, 3], [7, 7], [3, 11], [11, 11]];
const COLS = 'ABCDEFGHIJKLMNO';

/**
 * 나무 바둑판 + 돌. 그림은 모두 SVG 로 직접 그린다 (외부 이미지 없음).
 *
 * @param moves      판에 보일 수순 (흑부터). 복기 중이면 거기까지만 넘긴다
 * @param forbidden  { idx: reason } 금수 표시
 * @param turnColor  지금 둘 수 있는 색 (둘 수 없으면 null) → 미리보기 돌·클릭 가능
 * @param selected   "선택 후 착수" 방식에서 고른 칸
 * @param winLine    승리한 줄의 칸 목록
 */
const OmokBoard = ({
  moves, forbidden = {}, turnColor = null, selected = null, showNumbers = false, winLine = null,
  onPick, label, forbiddenLabel = () => '',
}) => {
  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  const occupied = useMemo(() => {
    const set = new Set(moves);
    return set;
  }, [moves]);

  const cellFromEvent = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * VIEW;
    const sy = ((e.clientY - rect.top) / rect.height) * VIEW;
    const x = Math.round((sx - PAD) / CELL);
    const y = Math.round((sy - PAD) / CELL);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return null;
    return toIdx(x, y);
  };

  const interactive = turnColor != null;
  const onMove = (e) => {
    if (!interactive || e.pointerType !== 'mouse') return;
    const idx = cellFromEvent(e);
    setHover(idx != null && !occupied.has(idx) ? idx : null);
  };
  const onClick = (e) => {
    if (!interactive) return;
    const idx = cellFromEvent(e);
    if (idx != null && !occupied.has(idx)) onPick?.(idx);
  };

  const last = moves.length - 1;
  const winSet = winLine ? new Set(winLine) : null;
  const ghost = interactive && hover != null && hover !== selected && !forbidden[hover] ? hover : null;
  const ghostFill = turnColor === BLACK ? 'url(#om-g-black)' : 'url(#om-g-white)';

  return (
    <div className={`om-board${interactive ? ' is-live' : ''}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        onClick={onClick}
      >
        <defs>
          <linearGradient id="om-g-wood" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#e9c078" />
            <stop offset="0.5" stopColor="#dcae62" />
            <stop offset="1" stopColor="#c99548" />
          </linearGradient>
          {/* 나뭇결: 한쪽으로 길게 늘인 잡음을 갈색으로 입힘 */}
          <filter id="om-f-grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.21" numOctaves="4" seed="23" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.36  0 0 0 0 0.2  0 0 0 0 0.05  1.9 0 0 0 -0.62" />
            <feComposite operator="in" in2="SourceGraphic" />
          </filter>
          <filter id="om-f-knot" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.03" numOctaves="2" seed="5" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 0.9  0 0 0 0 0.7  0 1.5 0 0 -0.55" />
            <feComposite operator="in" in2="SourceGraphic" />
          </filter>
          <radialGradient id="om-g-vignette" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#3a2206" stopOpacity="0.28" />
          </radialGradient>
          <radialGradient id="om-g-black" cx="0.36" cy="0.3" r="0.75">
            <stop offset="0" stopColor="#7c7c80" />
            <stop offset="0.22" stopColor="#3a3a3e" />
            <stop offset="0.6" stopColor="#141416" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
          <radialGradient id="om-g-white" cx="0.36" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#f4f2ec" />
            <stop offset="0.85" stopColor="#d6d2c6" />
            <stop offset="1" stopColor="#aba695" />
          </radialGradient>
          <radialGradient id="om-g-shadow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.55" stopColor="#1c0f00" stopOpacity="0.55" />
            <stop offset="1" stopColor="#1c0f00" stopOpacity="0" />
          </radialGradient>
          <filter id="om-f-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* 판 */}
        <rect width={VIEW} height={VIEW} rx="10" fill="url(#om-g-wood)" />
        <rect width={VIEW} height={VIEW} rx="10" fill="#000" filter="url(#om-f-grain)" opacity="0.5" />
        <rect width={VIEW} height={VIEW} rx="10" fill="#000" filter="url(#om-f-knot)" opacity="0.22" />
        <rect width={VIEW} height={VIEW} rx="10" fill="url(#om-g-vignette)" />
        <rect x="1.5" y="1.5" width={VIEW - 3} height={VIEW - 3} rx="9" fill="none" stroke="#fff3d6" strokeOpacity="0.35" strokeWidth="1.5" />

        {/* 격자 */}
        <g stroke="#3a2812" strokeOpacity="0.82" strokeWidth="1.15" strokeLinecap="square">
          {Array.from({ length: SIZE }, (_, i) => (
            <React.Fragment key={i}>
              <line x1={px(0)} y1={px(i)} x2={px(SIZE - 1)} y2={px(i)} />
              <line x1={px(i)} y1={px(0)} x2={px(i)} y2={px(SIZE - 1)} />
            </React.Fragment>
          ))}
        </g>
        <rect x={px(0)} y={px(0)} width={SPAN} height={SPAN} fill="none" stroke="#2f2010" strokeWidth="2.4" />
        {STARS.map(([x, y]) => <circle key={`${x}-${y}`} cx={px(x)} cy={px(y)} r="4.2" fill="#2f2010" />)}

        {/* 좌표: 위·아래 A~O, 왼쪽·오른쪽 15~1 */}
        <g className="om-coords" fill="#4a3317" fontSize="14" fontWeight="700" textAnchor="middle" dominantBaseline="central" aria-hidden="true">
          {Array.from({ length: SIZE }, (_, i) => (
            <React.Fragment key={i}>
              <text x={px(i)} y={PAD / 2 - 2}>{COLS[i]}</text>
              <text x={px(i)} y={VIEW - PAD / 2 + 3}>{COLS[i]}</text>
              <text x={PAD / 2 - 3} y={px(i)}>{SIZE - i}</text>
              <text x={VIEW - PAD / 2 + 3} y={px(i)}>{SIZE - i}</text>
            </React.Fragment>
          ))}
        </g>

        {/* 금수 자리 */}
        {Object.entries(forbidden).map(([k, reason]) => {
          const idx = Number(k);
          const cx = px(xOf(idx));
          const cy = px(yOf(idx));
          return (
            <g key={`f${idx}`} className="om-forbidden">
              <title>{`${coordOf(idx)} ${forbiddenLabel(reason)}`}</title>
              <circle cx={cx} cy={cy} r="11" fill="#fff" fillOpacity="0.5" />
              <path d={`M${cx - 7} ${cy - 7}L${cx + 7} ${cy + 7}M${cx + 7} ${cy - 7}L${cx - 7} ${cy + 7}`} stroke="#d5281b" strokeWidth="3.4" strokeLinecap="round" />
            </g>
          );
        })}

        {/* 돌 */}
        {moves.map((idx, i) => {
          const black = i % 2 === 0;
          const cx = px(xOf(idx));
          const cy = px(yOf(idx));
          const isLast = i === last;
          const inWin = winSet?.has(idx);
          return (
            <g key={`${i}-${idx}`} className={`om-stone${inWin ? ' is-win' : ''}`} style={{ transformOrigin: `${cx}px ${cy}px` }}>
              <circle cx={cx + 1.6} cy={cy + 2.6} r={R + 2.5} fill="url(#om-g-shadow)" />
              <circle cx={cx} cy={cy} r={R} fill={black ? 'url(#om-g-black)' : 'url(#om-g-white)'} />
              {showNumbers ? (
                <text
                  x={cx}
                  y={cy + 0.5}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={i + 1 >= 100 ? 13 : 16}
                  fontWeight="800"
                  fill={isLast ? '#ff5142' : black ? '#f2f2f2' : '#1b1b1b'}
                >
                  {i + 1}
                </text>
              ) : isLast && (
                <circle className="om-last" cx={cx} cy={cy} r="5" fill="#ff4a3a" stroke={black ? '#ffd9d4' : '#8a1309'} strokeWidth="1" />
              )}
            </g>
          );
        })}

        {/* 승리한 줄 */}
        {winLine && winLine.length >= 5 && (() => {
          const a = winLine[0];
          const b = winLine[winLine.length - 1];
          return (
            <g className="om-winline" filter="url(#om-f-glow)" pointerEvents="none">
              <line x1={px(xOf(a))} y1={px(yOf(a))} x2={px(xOf(b))} y2={px(yOf(b))} stroke="#ffd447" strokeWidth="7" strokeLinecap="round" pathLength="1" />
              {winLine.map((idx) => <circle key={idx} cx={px(xOf(idx))} cy={px(yOf(idx))} r={R + 2} fill="none" stroke="#ffd447" strokeWidth="3" />)}
            </g>
          );
        })()}

        {/* 미리보기 돌 (마우스) */}
        {ghost != null && (
          <circle className="om-ghost" cx={px(xOf(ghost))} cy={px(yOf(ghost))} r={R} fill={ghostFill} opacity="0.5" pointerEvents="none" />
        )}

        {/* 선택한 자리 ("선택 후 착수" 방식) */}
        {selected != null && (
          <g className="om-selected" pointerEvents="none">
            <circle cx={px(xOf(selected))} cy={px(yOf(selected))} r={R} fill={ghostFill} opacity="0.78" />
            <circle className="om-selected-ring" cx={px(xOf(selected))} cy={px(yOf(selected))} r={R + 4} fill="none" stroke="#ff4a3a" strokeWidth="3" />
            <path
              d={`M${px(xOf(selected))} ${px(0) - 6}V${px(SIZE - 1) + 6}M${px(0) - 6} ${px(yOf(selected))}H${px(SIZE - 1) + 6}`}
              stroke="#ff4a3a"
              strokeOpacity="0.45"
              strokeWidth="1.6"
              strokeDasharray="5 5"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

export default OmokBoard;
