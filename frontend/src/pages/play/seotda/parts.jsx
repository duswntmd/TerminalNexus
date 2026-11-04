import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SeotdaCard from './SeotdaCard.jsx';
import { fmt } from './helpers.js';

/** 공개 연출: open 이 되면 delay 뒤에 뒤집는다. dealKey 가 바뀌면(새 판) 다시 뒷면부터 */
const FlipCard = ({ id, open, delay, dealKey }) => {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    setShown(false);
    if (!open) return undefined;
    const tm = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(tm);
  }, [open, delay, dealKey]);
  return <SeotdaCard id={id ?? 0} faceDown={!open || !shown || id == null} />;
};

/**
 * 자리 하나: 이름, 포인트, 마지막 행동, 패 2장, 족보
 * cards 가 null 이면 뒷면 두 장 (모르는 패)
 */
export const Seat = ({ seat, dealKey, big = false }) => {
  const { t } = useTranslation();
  const cls = ['sd-seat'];
  if (big) cls.push('is-me');
  if (seat.isTurn) cls.push('is-turn');
  if (seat.folded) cls.push('is-folded');
  if (seat.win) cls.push('is-win');
  if (!seat.inHand) cls.push('is-out');
  const cards = seat.cards || [null, null];
  return (
    <div className={cls.join(' ')}>
      <div className="sd-seat-head">
        <span className="sd-seat-name">{seat.name}</span>
        {seat.isDealer && <span className="sd-badge">{t('seotda.dealer')}</span>}
      </div>
      <div className="sd-seat-chips">{t('seotda.points', { n: fmt(seat.chips) })}</div>
      {seat.inHand && (
        <div className="sd-cards" key={dealKey}>
          {cards.map((id, i) => (
            <span key={i} className="sd-deal" style={{ animationDelay: `${seat.order * 90 + i * 260}ms` }}>
              <FlipCard id={id} open={seat.open} delay={big ? 450 + i * 260 : i * 200} dealKey={dealKey} />
            </span>
          ))}
        </div>
      )}
      <div className="sd-seat-foot">
        {seat.handText
          ? <span className="sd-hand">{seat.handText}</span>
          : seat.inHand && <span className="sd-last">{seat.folded ? t('seotda.folded') : seat.last ? t(`seotda.acts.${seat.last}`) : ' '}</span>}
        {seat.payout > 0 && <span className="sd-payout">+{fmt(seat.payout)}P</span>}
      </div>
      {seat.hint && <div className="sd-hint-small">{seat.hint}</div>}
    </div>
  );
};

/** 판: 위쪽 상대들, 가운데 판돈, 아래 나 */
export const TableView = ({ seats, mySeat, pot, carry, cap, dealKey, status, children }) => {
  const { t } = useTranslation();
  const n = seats.length;
  const me = mySeat >= 0 ? seats[mySeat] : null;
  // 내 다음 사람부터 차례 순서로 위에 놓는다 (관전이면 0번부터)
  const start = mySeat >= 0 ? mySeat + 1 : 0;
  const others = [];
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if (i !== mySeat) others.push(seats[i]);
  }
  return (
    <div className="sd-table" role="region" aria-label={t('seotda.table_label')}>
      <div className="sd-opps" style={{ '--n': Math.max(others.length, 1) }}>
        {others.map((s) => <Seat key={s.key} seat={s} dealKey={dealKey} />)}
      </div>
      <div className="sd-center">
        <div className="sd-pot-label">{t('seotda.pot')}</div>
        <div className="sd-pot">{fmt(pot)}P</div>
        <div className="sd-center-sub">
          {carry > 0 && <span>{t('seotda.carry', { n: fmt(carry) })}</span>}
          {cap > 0 && <span>{t('seotda.cap', { n: fmt(cap) })}</span>}
        </div>
        {status && <p className="sd-status" aria-live="polite">{status}</p>}
      </div>
      {me && <Seat seat={me} dealKey={dealKey} big />}
      {children}
    </div>
  );
};

const ORDER = ['die', 'pass', 'bbing', 'half'];

/** 베팅 버튼 4개 (체크와 콜은 한 자리). acts: legalActions 결과 */
export const ActionBar = ({ acts, onAct }) => {
  const { t } = useTranslation();
  const find = (type) => acts.find((a) => a.type === type);
  return (
    <div className="sd-actions">
      {ORDER.map((slot) => {
        const a = slot === 'pass' ? find('check') || find('call') : find(slot);
        const type = a ? a.type : slot === 'pass' ? 'check' : slot;
        return (
          <button
            key={slot}
            type="button"
            className={`sd-act sd-act-${type}`}
            disabled={!a}
            onClick={() => a && onAct(a.type)}
          >
            <b>{t(`seotda.acts.${type}`)}</b>
            <small>{a && a.pay > 0 ? `${fmt(a.pay)}P` : t(`seotda.act_desc.${type}`)}</small>
          </button>
        );
      })}
    </div>
  );
};

/** 결과 (판 위에 띄움) */
export const ResultOverlay = ({ title, lines, change, onClose, children }) => {
  const { t } = useTranslation();
  return (
    <div className="sd-overlay" role="dialog" aria-label={title}>
      <div className="sd-overlay-box">
        <strong className={`sd-result-title${change < 0 ? ' is-lose' : ''}`}>{title}</strong>
        {lines.map((l, i) => <p key={i} className="sd-result-line">{l}</p>)}
        {change != null && (
          <p className={`sd-result-change${change > 0 ? ' up' : change < 0 ? ' down' : ''}`}>
            {t('seotda.result.change', { n: `${change > 0 ? '+' : ''}${fmt(change)}` })}
          </p>
        )}
        <div className="sd-overlay-actions">
          {children}
          <button type="button" className="ch-btn" onClick={onClose}>{t('seotda.actions.close')}</button>
        </div>
      </div>
    </div>
  );
};

/** 진행 기록 (최신이 보이도록 자동 스크롤) */
export const HandLog = ({ lines }) => {
  const { t } = useTranslation();
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [lines.length]);
  return (
    <div className="ch-panel">
      <h3 className="ch-section-title">{t('seotda.log_title')}</h3>
      {lines.length === 0
        ? <p className="ch-empty">{t('seotda.log_empty')}</p>
        : <ol className="sd-log" ref={ref}>{lines.map((l, i) => <li key={i}>{l}</li>)}</ol>}
    </div>
  );
};

/** 족보표 */
export const RankTable = () => {
  const { t } = useTranslation();
  const ranks = t('seotda.ranks', { returnObjects: true });
  return (
    <div className="ch-panel">
      <h3 className="ch-section-title">{t('seotda.ranks_title')}</h3>
      <ol className="sd-ranks">
        {Array.isArray(ranks) && ranks.map(([name, desc]) => <li key={name}><b>{name}</b> <span>{desc}</span></li>)}
      </ol>
    </div>
  );
};
