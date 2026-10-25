import React, { useEffect, useRef } from 'react';
import { CHO, FORMATIONS, PIECE_CHAR, typeOf, teamOf } from './engine.js';

/** 대국자 카드: 진영 배지, 이름, 점수, 잡은 기물 */
export const PlayerCard = ({ team, name, sub, isTurn, score, captured = [] }) => (
  <div className={`jg-player${isTurn ? ' is-turn' : ''}`}>
    <div className={`jg-player-badge ${team === CHO ? 'cho' : 'han'}`}>{team === CHO ? '楚' : '漢'}</div>
    <div style={{ minWidth: 0 }}>
      <div className="jg-player-name">{name}</div>
      {sub && <div className="jg-player-sub">{sub}</div>}
      {captured.length > 0 && (
        <div className="jg-captured" title="잡은 기물">
          {captured.map((p, i) => (
            <span key={i} style={{ color: teamOf(p) === CHO ? '#22c55e' : '#f87171' }}>{PIECE_CHAR[teamOf(p)][typeOf(p)]}</span>
          ))}
        </div>
      )}
    </div>
    <div className="jg-player-score">{score}점</div>
  </div>
);

/** 상차림 선택 */
export const FormationPicker = ({ value, onChange, disabled }) => (
  <div className="jg-choices">
    {Object.entries(FORMATIONS).map(([key, f]) => (
      <button
        key={key}
        type="button"
        className={`jg-choice${value === key ? ' is-active' : ''}`}
        onClick={() => onChange(key)}
        disabled={disabled}
      >
        {f.name}
        <small>{f.desc}</small>
      </button>
    ))}
  </div>
);

/** 기보 목록 (최신 수가 보이도록 자동 스크롤) */
export const MoveList = ({ notations }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [notations.length]);
  return (
    <div className="jg-panel">
      <h3 className="jg-section-title">기보 ({notations.length}수)</h3>
      {notations.length === 0
        ? <p className="jg-empty">아직 둔 수가 없습니다.</p>
        : <ol className="jg-moves" ref={ref}>{notations.map((n, i) => <li key={i}>{n}</li>)}</ol>}
    </div>
  );
};
