import React from 'react';
import { useTranslation } from 'react-i18next';
import HwatuCard from '../../../components/hwatu/HwatuCard.jsx';
import { monthOf } from '../../../components/hwatu/cards.js';
import { GUKJIN_ID, scoreOf } from './engine.js';
import { groupCaptured } from './helpers.js';

/** 점수 항목 칩 */
export const ScoreChips = ({ score }) => {
  const { t } = useTranslation();
  if (!score.items.length) return <span className="gs-chip is-empty">{t('gostop.no_score')}</span>;
  return score.items.map(([key, n]) => <span key={key} className="gs-chip">{t(`gostop.score_items.${key}`)} {n}</span>);
};

/** 한 사람의 먹은 패 + 점수 */
export const CapturedArea = ({ captured, gukjin, onGukjin, label, compact = false }) => {
  const { t } = useTranslation();
  const score = scoreOf(captured, gukjin);
  const groups = groupCaptured(captured, gukjin);
  const counts = score.counts;
  return (
    <div className={`gs-captured${compact ? ' is-compact' : ''}`}>
      <div className="gs-captured-head">
        <span className="gs-captured-label">{label}</span>
        <strong className="gs-score">{t('gostop.points_unit', { n: score.total })}</strong>
        <span className="gs-chips"><ScoreChips score={score} /></span>
      </div>
      <div className="gs-groups">
        {['gwang', 'yeol', 'tti', 'pi'].map((k) => (
          <div key={k} className={`gs-group g-${k}`}>
            <span className="gs-group-name">{t(`gostop.kinds.${k}`)} <b>{counts[k]}</b></span>
            <div className="gs-group-cards">
              {groups[k].map((id) => <div key={id} className="gs-mini"><HwatuCard id={id} /></div>)}
            </div>
          </div>
        ))}
      </div>
      {onGukjin && captured.includes(GUKJIN_ID) && (
        <div className="gs-gukjin">
          <span>{t('gostop.gukjin.label')}</span>
          {[null, 'yeol', 'pi'].map((v) => (
            <button key={String(v)} type="button" className={`gs-pill${gukjin === v ? ' is-active' : ''}`} onClick={() => onGukjin(v)}>
              {t(`gostop.gukjin.${v ?? 'auto'}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** 바닥 패: 같은 월끼리 겹쳐 보인다. highlight: 강조할 카드, onPick: 고르기 */
export const Floor = ({ floor, ppeokOwner = {}, highlight = [], pickable = [], onPick, deckCount, last }) => {
  const { t } = useTranslation();
  const groups = [];
  const index = {};
  floor.forEach((id) => {
    const m = monthOf(id);
    if (index[m] === undefined) { index[m] = groups.length; groups.push({ m, cards: [] }); }
    groups[index[m]].cards.push(id);
  });
  return (
    <div className="gs-floor-wrap">
      <div className="gs-deck" title={t('gostop.deck')}>
        <div className="gs-deck-card"><HwatuCard back /></div>
        <span>{deckCount}</span>
      </div>
      <div className="gs-floor" aria-label={t('gostop.floor')}>
        {groups.length === 0 && <span className="gs-empty">{t('gostop.floor_empty')}</span>}
        {groups.map(({ m, cards }) => (
          <div key={m} className={`gs-stack${ppeokOwner[m] !== undefined ? ' is-ppeok' : ''}`}>
            {cards.map((id) => {
              const canPick = pickable.includes(id);
              const cls = `gs-floor-card${highlight.includes(id) ? ' is-match' : ''}${canPick ? ' is-pick' : ''}${last && last.includes(id) ? ' is-new' : ''}`;
              return canPick ? (
                <button key={id} type="button" className={cls} onClick={() => onPick(id)}><HwatuCard id={id} /></button>
              ) : (
                <div key={id} className={cls}><HwatuCard id={id} /></div>
              );
            })}
            {ppeokOwner[m] !== undefined && <span className="gs-ppeok-tag">{t('gostop.events.ppeok')}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

/** 이번 차례에 낸 패·뒤집은 패 */
export const TurnStrip = ({ last, name }) => {
  const { t } = useTranslation();
  if (!last) return null;
  return (
    <div className="gs-turnstrip">
      <span>{t('gostop.last_turn', { name })}</span>
      {last.played != null && <div className="gs-mini lg" title={t('gostop.played')}><HwatuCard id={last.played} /></div>}
      {last.flipped != null && <><span className="gs-arrow">↻</span><div className="gs-mini lg" title={t('gostop.flipped')}><HwatuCard id={last.flipped} /></div></>}
      <span className="gs-took">{last.took.length ? t('gostop.took', { n: last.took.length }) : t('gostop.took_none')}</span>
    </div>
  );
};

/** 판 위 이벤트 알림 (뻑, 쪽, 고 등) */
export const EventBanner = ({ banner }) => {
  if (!banner) return null;
  return <div key={banner.key} className={`gs-banner tone-${banner.tone}`}>{banner.text}</div>;
};

/** 결과 정산 */
export const Settlement = ({ result, names, delta, children }) => {
  const { t } = useTranslation();
  const title = result.winner == null ? t('gostop.result.nagari') : t('gostop.result.wins', { name: names[result.winner] });
  return (
    <div className="gs-overlay" role="dialog" aria-label={title}>
      <div className="gs-overlay-box gs-settle">
        <strong className="gs-settle-title">{title}</strong>
        <p className="gs-settle-reason">{t(`gostop.reason.${result.reason}`)}</p>
        {result.winner != null && (
          <table className="gs-settle-table">
            <tbody>
              {result.score && result.score.items.map(([key, n]) => (
                <tr key={key}><td>{t(`gostop.score_items.${key}`)}</td><td>{n}</td></tr>
              ))}
              {result.goCount > 0 && <tr><td>{t('gostop.settle.go_bonus', { n: result.goCount })}</td><td>+{result.goCount}</td></tr>}
              <tr className="is-sum"><td>{t('gostop.settle.base')}</td><td>{result.base}</td></tr>
              {result.multipliers.map(([key, x]) => (
                <tr key={key}><td>{t(`gostop.settle.mul.${key}`)}</td><td>×{x}</td></tr>
              ))}
              <tr className="is-total"><td>{t('gostop.settle.final')}</td><td>{t('gostop.points_unit', { n: result.final })}</td></tr>
            </tbody>
          </table>
        )}
        {result.winner == null && <p className="gs-hint">{t('gostop.settle.nagari_next', { x: result.nextCarry })}</p>}
        {delta != null && (
          <p className={`gs-delta${delta >= 0 ? ' up' : ' down'}`}>{delta >= 0 ? '+' : ''}{delta.toLocaleString()}P</p>
        )}
        <div className="gs-actions">{children}</div>
      </div>
    </div>
  );
};
