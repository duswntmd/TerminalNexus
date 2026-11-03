import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WHITE, colorOf, typeOf } from './engine.js';

const S = 100; // 칸 크기 (viewBox 단위)
const FILES = 'abcdefgh';
// 속이 찬 글리프를 두 색 모두에 쓰고 색칠로 구분. FE0E: 이모지 대신 글자 모양으로 표시
export const GLYPH = ['', '♟︎', '♞︎', '♝︎', '♜︎', '♛︎', '♚︎'];

/**
 * 체스판 (SVG). 클릭 이동과 드래그(마우스·터치) 모두 지원
 * @param board    길이 64 배열 (0 = a8)
 * @param flipped  흑 시점으로 표시
 * @param legal    지금 둘 수 있는 수 [{ from, to, promo, uci }] (둘 수 없으면 빈 배열)
 * @param lastMove { from, to }
 * @param checkSq  체크받은 킹의 칸
 * @param onMove   (from, to) 콜백. 승진 선택은 부모가 처리
 */
const ChessBoard = ({ board, flipped = false, legal = [], lastMove = null, checkSq = null, onMove, label }) => {
  const [selected, setSelected] = useState(null);
  const [drag, setDrag] = useState(null); // { from, x, y, moved, toggle }
  const svgRef = useRef(null);

  // 판이 바뀌면(수를 두면) 선택 해제
  useEffect(() => {
    setSelected(null);
    setDrag(null);
  }, [board]);

  const movable = useMemo(() => new Set(legal.map((m) => m.from)), [legal]);
  const targetsOf = (sq) => (sq == null ? [] : [...new Set(legal.filter((m) => m.from === sq).map((m) => m.to))]);
  const active = drag ? drag.from : selected;
  const targets = targetsOf(active);

  const xy = (sq) => {
    let c = sq & 7;
    let r = sq >> 3;
    if (flipped) { c = 7 - c; r = 7 - r; }
    return { x: c * S, y: r * S };
  };
  const pointer = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * 8 * S, y: ((e.clientY - rect.top) / rect.height) * 8 * S };
  };
  const sqAt = ({ x, y }) => {
    let c = Math.floor(x / S);
    let r = Math.floor(y / S);
    if (c < 0 || c > 7 || r < 0 || r > 7) return null;
    if (flipped) { c = 7 - c; r = 7 - r; }
    return r * 8 + c;
  };

  const onPointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const p = pointer(e);
    const sq = sqAt(p);
    if (sq == null) return;
    if (selected != null && targets.includes(sq)) {
      setSelected(null);
      onMove?.(selected, sq);
      return;
    }
    if (movable.has(sq)) {
      e.preventDefault();
      svgRef.current.setPointerCapture?.(e.pointerId);
      setDrag({ from: sq, ...p, moved: false, toggle: selected === sq });
      setSelected(sq);
    } else setSelected(null);
  };

  const onPointerMove = (e) => {
    if (!drag) return;
    const p = pointer(e);
    const start = xy(drag.from);
    const moved = drag.moved || Math.hypot(p.x - (start.x + S / 2), p.y - (start.y + S / 2)) > S * 0.25;
    setDrag({ ...drag, ...p, moved });
  };

  const onPointerUp = (e) => {
    if (!drag) return;
    const sq = sqAt(pointer(e));
    const { from, moved, toggle } = drag;
    setDrag(null);
    if (moved && sq !== from) {
      if (sq != null && targetsOf(from).includes(sq)) {
        setSelected(null);
        onMove?.(from, sq);
      }
      return;
    }
    if (toggle) setSelected(null); // 선택된 기물을 다시 누르면 해제
  };

  const hoverSq = drag?.moved ? sqAt(drag) : null;
  const light = (sq) => (((sq >> 3) + (sq & 7)) & 1) === 0;

  return (
    <svg
      ref={svgRef}
      className={`ch-board${movable.size ? ' is-movable' : ''}${drag?.moved ? ' is-dragging' : ''}`}
      viewBox={`0 0 ${8 * S} ${8 * S}`}
      role="img"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => setDrag(null)}
    >
      <defs>
        <radialGradient id="ch-check-glow">
          <stop offset="0%" stopColor="#ff3b30" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#ff3b30" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ff3b30" stopOpacity="0" />
        </radialGradient>
      </defs>

      {board.map((_, sq) => {
        const { x, y } = xy(sq);
        return <rect key={`s${sq}`} x={x} y={y} width={S} height={S} className={light(sq) ? 'ch-sq-light' : 'ch-sq-dark'} />;
      })}

      {lastMove && [lastMove.from, lastMove.to].map((sq, k) => {
        const { x, y } = xy(sq);
        return <rect key={`lm${k}`} x={x} y={y} width={S} height={S} className="ch-last" />;
      })}
      {active != null && (() => {
        const { x, y } = xy(active);
        return <rect x={x} y={y} width={S} height={S} className="ch-selected" />;
      })()}
      {checkSq != null && (() => {
        const { x, y } = xy(checkSq);
        return <rect x={x} y={y} width={S} height={S} fill="url(#ch-check-glow)" className="ch-check" />;
      })()}
      {hoverSq != null && targets.includes(hoverSq) && (() => {
        const { x, y } = xy(hoverSq);
        return <rect x={x + 3} y={y + 3} width={S - 6} height={S - 6} className="ch-hover" />;
      })()}

      {/* 좌표 */}
      {Array.from({ length: 8 }, (_, i) => {
        // 맨 아래 줄 i번째 칸과 맨 왼쪽 줄 i번째 칸 (글자색을 칸 색과 반대로)
        const fileSq = flipped ? 7 - i : 56 + i;
        const rankSq = flipped ? (7 - i) * 8 + 7 : i * 8;
        return (
          <g key={`co${i}`} className="ch-coord">
            <text x={i * S + S - 6} y={8 * S - 7} textAnchor="end" className={light(fileSq) ? 'on-light' : 'on-dark'}>{FILES[fileSq & 7]}</text>
            <text x={5} y={i * S + 20} className={light(rankSq) ? 'on-light' : 'on-dark'}>{8 - (rankSq >> 3)}</text>
          </g>
        );
      })}

      {/* 둘 수 있는 칸 */}
      {targets.map((sq) => {
        const { x, y } = xy(sq);
        return board[sq]
          ? <circle key={`t${sq}`} cx={x + S / 2} cy={y + S / 2} r={S * 0.44} className="ch-target-capture" />
          : <circle key={`t${sq}`} cx={x + S / 2} cy={y + S / 2} r={S * 0.15} className="ch-target" />;
      })}

      {/* 기물 */}
      {board.map((p, sq) => {
        if (!p) return null;
        const { x, y } = xy(sq);
        const dragging = drag?.moved && drag.from === sq;
        return (
          <text
            key={`p${sq}`}
            x={x + S / 2}
            y={y + S / 2 + 4}
            className={`ch-piece ${colorOf(p) === WHITE ? 'w' : 'b'}${movable.has(sq) ? ' is-movable' : ''}${dragging ? ' is-ghost' : ''}`}
          >
            {GLYPH[typeOf(p)]}
          </text>
        );
      })}

      {drag?.moved && board[drag.from] ? (
        <text x={drag.x} y={drag.y + 4} className={`ch-piece is-drag ${colorOf(board[drag.from]) === WHITE ? 'w' : 'b'}`}>
          {GLYPH[typeOf(board[drag.from])]}
        </text>
      ) : null}
    </svg>
  );
};

export default ChessBoard;
