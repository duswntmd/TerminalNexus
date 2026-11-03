import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { WHITE, BLACK, QUEEN, ROOK, BISHOP, KNIGHT, typeOf } from './engine.js';
import { GLYPH } from './ChessBoard.jsx';

export const colorKey = (c) => (c === WHITE ? 'white' : 'black');
export const colorFromName = (name) => (name === 'WHITE' ? WHITE : name === 'BLACK' ? BLACK : null);

/** 대국자 카드: 색 표시, 이름, 잡은 기물, 기물 점수 우세 */
export const PlayerCard = ({ color, name, sub, isTurn, captured = [], advantage = 0 }) => {
  const { t } = useTranslation();
  return (
    <div className={`ch-player${isTurn ? ' is-turn' : ''}`}>
      <div className={`ch-player-badge ${colorKey(color)}`} aria-hidden="true">{GLYPH[6]}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="ch-player-name">{name}</div>
        {sub && <div className="ch-player-sub">{sub}</div>}
        {captured.length > 0 && (
          <div className="ch-captured" title={t('chess.captured')}>
            {captured.map((p, i) => <span key={i} className={color === WHITE ? 'b' : 'w'}>{GLYPH[typeOf(p)]}</span>)}
            {advantage > 0 && <em>+{advantage}</em>}
          </div>
        )}
      </div>
    </div>
  );
};

/** 기보 목록: 한 줄에 백·흑 한 수씩 (최신 수가 보이도록 자동 스크롤) */
export const MoveList = ({ moves }) => {
  const { t } = useTranslation();
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [moves.length]);
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) rows.push([moves[i], moves[i + 1]]);
  return (
    <div className="ch-panel">
      <h3 className="ch-section-title">{t('chess.moves_title', { count: moves.length })}</h3>
      {moves.length === 0
        ? <p className="ch-empty">{t('chess.no_moves')}</p>
        : (
          <ol className="ch-moves" ref={ref}>
            {rows.map(([w, b], i) => (
              <li key={i}>
                <span className={`ch-san${i * 2 === moves.length - 1 ? ' is-last' : ''}`}>{w.san}</span>
                {b && <span className={`ch-san${i * 2 + 1 === moves.length - 1 ? ' is-last' : ''}`}>{b.san}</span>}
              </li>
            ))}
          </ol>
        )}
    </div>
  );
};

/** 승진 기물 선택 (판 위에 띄움) */
export const PromotionPicker = ({ color, onPick, onCancel }) => {
  const { t } = useTranslation();
  return (
    <div className="ch-overlay" role="dialog" aria-label={t('chess.promo_title')} onClick={onCancel}>
      <div className="ch-overlay-box" onClick={(e) => e.stopPropagation()}>
        <p className="ch-overlay-title">{t('chess.promo_title')}</p>
        <div className="ch-promo">
          {[QUEEN, ROOK, BISHOP, KNIGHT].map((tp) => (
            <button key={tp} type="button" className={`ch-promo-btn ${colorKey(color)}`} onClick={() => onPick(tp)} title={t(`chess.pieces.${'  nbrq'[tp]}`)}>
              <span aria-hidden="true">{GLYPH[tp]}</span>
              <small>{t(`chess.pieces.${' pnbrqk'[tp]}`)}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/** 결과 화면 (판 위에 띄움) */
export const ResultOverlay = ({ title, reason, children, onClose }) => {
  const { t } = useTranslation();
  return (
    <div className="ch-overlay" role="dialog" aria-label={title}>
      <div className="ch-overlay-box ch-result-box">
        <strong className="ch-result-title">{title}</strong>
        <p className="ch-result-reason">{reason}</p>
        <div className="ch-actions">
          {children}
          <button type="button" className="ch-btn" onClick={onClose}>{t('chess.actions.close')}</button>
        </div>
      </div>
    </div>
  );
};
