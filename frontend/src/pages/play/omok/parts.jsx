import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { coordOf } from './engine.js';
import { colorKey } from './helpers.js';

/** 오른쪽 위 옵션 버튼 */
export const OptionButtons = ({ opts, toggle }) => {
  const { t } = useTranslation();
  const items = [
    ['sound', opts.sound ? '🔊' : '🔇'],
    ['numbers', '①'],
    ['confirm', '🎯'],
  ];
  return (
    <div className="om-opts">
      {items.map(([key, icon]) => (
        <button
          key={key}
          type="button"
          className={`om-opt${opts[key] ? ' is-on' : ''}`}
          aria-pressed={opts[key]}
          title={t(`omok.opts.${key}`)}
          aria-label={t(`omok.opts.${key}`)}
          onClick={() => toggle(key)}
        >
          <span aria-hidden="true">{icon}</span>
          <small>{t(`omok.opts.${key}_short`)}</small>
        </button>
      ))}
    </div>
  );
};

/** 대국자 카드: 돌, 이름, 설명, 시계. progress(0~1)를 주면 남은 시간 막대를 그린다 */
export const PlayerCard = ({ color, name, sub, active, clock, low, progress, tag }) => (
  <div className={`om-player ${colorKey(color)}${active ? ' is-turn' : ''}${low ? ' is-low' : ''}`}>
    <span className={`om-dot ${colorKey(color)}`} aria-hidden="true" />
    <div className="om-player-text">
      <div className="om-player-name">{name}{tag && <em>{tag}</em>}</div>
      {sub && <div className="om-player-sub">{sub}</div>}
    </div>
    {clock != null && <div className="om-clock">{clock}</div>}
    {progress != null && <div className="om-timebar"><i style={{ transform: `scaleX(${Math.max(0, Math.min(1, progress))})` }} /></div>}
  </div>
);

/** 기보: 수순 번호 + 좌표. 끝난 판에서는 눌러서 그 수로 이동 */
export const MoveList = ({ moves, current, onJump }) => {
  const { t } = useTranslation();
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current?.querySelector('.is-current');
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [current, moves.length]);
  return (
    <div className="om-moves">
      <div className="om-moves-head">{t('omok.moves_title', { count: moves.length })}</div>
      {moves.length === 0 ? <p className="om-empty">{t('omok.no_moves')}</p> : (
        <ol className="om-moves-list" ref={ref}>
          {moves.map((idx, i) => (
            <li key={i}>
              <button
                type="button"
                className={`om-move ${i % 2 === 0 ? 'black' : 'white'}${i + 1 === current ? ' is-current' : ''}`}
                disabled={!onJump}
                onClick={() => onJump?.(i + 1)}
              >
                <b>{i + 1}</b>{coordOf(idx)}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

/** 복기 이동: 처음 / 이전 / 다음 / 끝 */
export const ReviewBar = ({ ply, total, onGo }) => {
  const { t } = useTranslation();
  const btn = (key, icon, to, disabled) => (
    <button type="button" className="om-btn" title={t(`omok.review.${key}`)} aria-label={t(`omok.review.${key}`)} disabled={disabled} onClick={() => onGo(to)}>{icon}</button>
  );
  return (
    <div className="om-review" role="group" aria-label={t('omok.review.title')}>
      {btn('first', '⏮', 0, ply === 0)}
      {btn('prev', '◀', ply - 1, ply === 0)}
      <span className="om-review-pos">{ply} / {total}</span>
      {btn('next', '▶', ply + 1, ply === total)}
      {btn('last', '⏭', total, ply === total)}
    </div>
  );
};

const CONFETTI = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 53) % 90) / 100,
  dur: 1.6 + ((i * 29) % 100) / 80,
  hue: [46, 8, 200, 140, 280][i % 5],
  rot: (i * 47) % 360,
}));

/** 결과 화면 (판 위에 띄움). kind: win | lose | draw | plain */
export const ResultOverlay = ({ kind, title, reason, children }) => (
  <div className={`om-result is-${kind}`} role="dialog" aria-label={title}>
    {kind === 'win' && (
      <div className="om-confetti" aria-hidden="true">
        {CONFETTI.map((c, i) => (
          <i key={i} style={{ left: `${c.left}%`, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, background: `hsl(${c.hue} 90% 60%)`, transform: `rotate(${c.rot}deg)` }} />
        ))}
      </div>
    )}
    <div className="om-result-box">
      <strong className="om-result-title">{title}</strong>
      {reason && <p className="om-result-reason">{reason}</p>}
      <div className="om-result-actions">{children}</div>
    </div>
  </div>
);

/** 잠깐 떴다 사라지는 안내 (helpers.js 의 useToast 와 함께 사용) */
export const Toast = ({ toast }) => (toast ? <div key={toast.key} className="om-toast" role="alert">{toast.text}</div> : null);
