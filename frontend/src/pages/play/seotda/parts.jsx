import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import HwatuCard from '../../../components/hwatu/HwatuCard.jsx';
import { toHwatuId } from './engine.js';
import { fmt, REVEAL_GAP } from './helpers.js';

/**
 * 카드 한 장: 공용 화투 그림을 앞뒤로 겹쳐 뒤집는다.
 * id 가 null 이면 뒷면만. up 이 되면 delay 뒤에 앞면으로 뒤집힌다.
 */
export const Card = ({ id, up, delay = 0, picked = false, dim = false, tag }) => {
  const [shown, setShown] = useState(false);
  const open = up && id != null;
  useEffect(() => {
    if (!open) { setShown(false); return undefined; }
    const tm = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(tm);
  }, [open, delay, id]);
  const cls = ['sd-card'];
  if (!(open && shown)) cls.push('is-down');
  if (picked) cls.push('is-picked');
  if (dim) cls.push('is-dim');
  return (
    <span className={cls.join(' ')}>
      <span className="sd-card-inner">
        <span className="sd-card-face sd-card-front">{id != null && <HwatuCard id={toHwatuId(id)} />}</span>
        <span className="sd-card-face sd-card-back"><HwatuCard back /></span>
      </span>
      {tag && <span className="sd-card-tag">{tag}</span>}
    </span>
  );
};

/**
 * 자리 하나.
 * seat: { key, name, chips, inHand, folded, last, isTurn, isDealer, choosing, cards:[{ id, up, picked, dim, tag }],
 *         handText, revealIndex(-1이면 공개 안 함), win, payout }
 */
export const Seat = ({ seat, me = false, dealKey, area }) => {
  const { t } = useTranslation();
  const cls = ['sd-seat', `sd-area-${area}`];
  if (me) cls.push('is-me');
  if (seat.isTurn || seat.choosing) cls.push('is-turn');
  if (seat.folded) cls.push('is-folded');
  if (seat.win) cls.push('is-win');
  if (!seat.inHand) cls.push('is-out');
  const revealDelay = seat.revealIndex >= 0 ? seat.revealIndex * REVEAL_GAP : 0;
  const bubble = seat.folded ? t('seotda.acts.die') : seat.choosing ? t('seotda.status.choosing') : seat.last ? t(`seotda.acts.${seat.last}`) : null;
  return (
    <div className={cls.join(' ')}>
      <div className="sd-seat-head">
        {seat.isDealer && <span className="sd-badge" title={t('seotda.dealer_desc')}>{t('seotda.dealer')}</span>}
        <span className="sd-seat-name">{seat.name}</span>
      </div>
      <div className="sd-seat-chips">{t('seotda.points', { n: fmt(seat.chips) })}</div>
      {seat.inHand ? (
        <div className="sd-cards" key={dealKey}>
          {seat.cards.map((c, i) => (
            <span key={i} className="sd-deal" style={{ animationDelay: `${i * 120}ms` }}>
              <Card id={c.id} up={c.up} delay={c.revealed ? revealDelay : me ? 250 : 0} picked={c.picked} dim={c.dim} tag={c.tag} />
            </span>
          ))}
        </div>
      ) : <div className="sd-sitout">{t('seotda.sit_out')}</div>}
      <div className="sd-seat-foot">
        {seat.handText
          ? <span className="sd-hand" style={{ animationDelay: `${revealDelay + 300}ms` }}>{seat.handText}</span>
          : bubble && <span className={`sd-bubble${seat.folded ? ' is-die' : ''}`}>{bubble}</span>}
        {seat.payout > 0 && <span className="sd-payout" style={{ animationDelay: `${revealDelay + 300}ms` }}>+{fmt(seat.payout)}P</span>}
      </div>
    </div>
  );
};

// 상대 수에 따른 자리 (판을 둘러싼 배치: 나는 아래, 상대는 왼쪽·위·오른쪽)
const AREAS = { 1: ['t'], 2: ['l', 'r'], 3: ['l', 't', 'r'] };

/** 판 전체. view.seats 는 자리 순서, mySeat 은 내 자리 (관전이면 -1) */
export const TableView = ({ view, mySeat, status, children }) => {
  const { t } = useTranslation();
  const n = view.seats.length;
  const start = mySeat >= 0 ? mySeat + 1 : 0;
  const others = [];
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if (i !== mySeat) others.push(view.seats[i]);
  }
  const areas = AREAS[others.length] || AREAS[3];
  const me = mySeat >= 0 ? view.seats[mySeat] : null;
  const phaseKey = view.phase === 'bet' ? `bet${view.round}` : view.phase;
  return (
    <div className={`sd-table sd-opps-${others.length}`} role="region" aria-label={t('seotda.table_label')}>
      {others.map((s, k) => <Seat key={s.key} seat={s} dealKey={view.handNo} area={areas[k] || 't'} />)}
      <div className="sd-center">
        <div className="sd-center-tags">
          <span className="sd-tag">{t(`seotda.modes.${view.mode}`)}</span>
          {view.redo && <span className="sd-tag is-redo">{t('seotda.redo_hand')}</span>}
        </div>
        <div className="sd-pot-label">{t('seotda.pot')}</div>
        <div className="sd-pot">{fmt(view.pot)}P</div>
        {view.phase && view.phase !== 'done' && <div className="sd-phase">{t(`seotda.phase.${phaseKey}`)}</div>}
        {view.cap > 0 && view.phase === 'bet' && <div className="sd-center-sub">{t('seotda.cap', { n: fmt(view.cap) })}</div>}
        {status && <p className="sd-status" aria-live="polite">{status}</p>}
      </div>
      {me && <Seat seat={me} me dealKey={view.handNo} area="m" />}
      {children}
    </div>
  );
};

const SLOTS = ['die', 'pass', 'bbing', 'ddadang', 'quarter', 'half'];

/** 베팅 버튼 6개 (체크와 콜은 한 자리). acts: legalActions 결과 */
export const ActionBar = ({ acts, onAct }) => {
  const { t } = useTranslation();
  const find = (type) => acts.find((a) => a.type === type);
  return (
    <div className="sd-actions">
      {SLOTS.map((slot) => {
        const a = slot === 'pass' ? find('check') || find('call') : find(slot);
        const type = a ? a.type : slot === 'pass' ? 'check' : slot;
        return (
          <button key={slot} type="button" className={`sd-act sd-act-${type}`} disabled={!a} onClick={() => a && onAct(a.type)}>
            <b>{t(`seotda.acts.${type}`)}</b>
            <small>{a && a.pay > 0 ? `${fmt(a.pay)}P` : t(`seotda.act_short.${type}`)}</small>
          </button>
        );
      })}
    </div>
  );
};

/** 3장 섯다: 공개할 패 고르기 */
export const OpenPicker = ({ cards, onPick }) => {
  const { t } = useTranslation();
  return (
    <div className="sd-chooser">
      <p className="sd-chooser-title">{t('seotda.open_title')}</p>
      <div className="sd-chooser-cards">
        {cards.slice(0, 2).map((id, k) => (
          <button key={k} type="button" className="sd-pick-card" onClick={() => onPick(k)}>
            <Card id={id} up />
            <span>{t('seotda.open_this')}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

/** 3장 섯다: 승부에 쓸 2장 고르기. options: [{ pick:[i,j], cards:[a,b], name, best }] */
export const SelectPicker = ({ options, onPick }) => {
  const { t } = useTranslation();
  return (
    <div className="sd-chooser">
      <p className="sd-chooser-title">{t('seotda.select_title')}</p>
      <div className="sd-options">
        {options.map((o) => (
          <button key={o.pick.join()} type="button" className={`sd-option${o.best ? ' is-best' : ''}`} onClick={() => onPick(o.pick)}>
            <span className="sd-option-cards">{o.cards.map((id) => <Card key={id} id={id} up />)}</span>
            <b>{o.name}</b>
            {o.best && <small>{t('seotda.recommended')}</small>}
          </button>
        ))}
      </div>
    </div>
  );
};

/** 결과 (판 위에 띄움, 패를 다 뒤집은 뒤 나타남) */
export const ResultOverlay = ({ title, lines, change, delay = 0, onClose, children }) => {
  const { t } = useTranslation();
  return (
    <div className="sd-overlay" role="dialog" aria-label={title} style={{ animationDelay: `${delay}ms` }}>
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

/** 족보표 (특수패 포함) */
export const RankTable = () => {
  const { t } = useTranslation();
  const ranks = t('seotda.ranks', { returnObjects: true });
  const specials = t('seotda.specials', { returnObjects: true });
  return (
    <div className="ch-panel">
      <h3 className="ch-section-title">{t('seotda.ranks_title')}</h3>
      <ol className="sd-ranks">
        {Array.isArray(ranks) && ranks.map(([name, desc]) => <li key={name}><b>{name}</b> <span>{desc}</span></li>)}
      </ol>
      <h3 className="ch-section-title" style={{ marginTop: 12 }}>{t('seotda.specials_title')}</h3>
      <ul className="sd-ranks">
        {Array.isArray(specials) && specials.map(([name, desc]) => <li key={name}><b>{name}</b> <span>{desc}</span></li>)}
      </ul>
    </div>
  );
};
