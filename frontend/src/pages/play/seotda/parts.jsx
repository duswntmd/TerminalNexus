import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
        <span className="sd-card-face sd-card-front">{id != null && <HwatuCard id={toHwatuId(id)} marks={false} />}</span>
        <span className="sd-card-face sd-card-back"><HwatuCard back /></span>
      </span>
      {tag && <span className="sd-card-tag">{tag}</span>}
    </span>
  );
};

/* ── 칩: 판돈을 실제 칩 더미처럼 (금액을 큰 칩부터 나눠 쌓음) ── */
const CHIP_KINDS = [[10000, 'c10k'], [5000, 'c5k'], [1000, 'c1k'], [500, 'c500'], [100, 'c100']];
const MAX_CHIPS = 28;

const chipList = (amount) => {
  const out = [];
  let left = amount;
  // 칩이 6개 이상 되는 가장 큰 단위부터 써서 더미가 풍성해 보이게
  const from = CHIP_KINDS.findIndex(([v]) => amount / v >= 6);
  for (const [v, cls] of CHIP_KINDS.slice(from < 0 ? CHIP_KINDS.length - 1 : from)) {
    while (left >= v && out.length < MAX_CHIPS) { out.push(cls); left -= v; }
  }
  if (left > 0 && out.length < MAX_CHIPS) out.push('c100');
  return out;
};

export const Chip = ({ kind = 'c100' }) => <span className={`sd-chip ${kind}`} aria-hidden="true" />;

/** 판돈 칩 더미: 같은 종류끼리 한 줄로 쌓아 최대 6줄 */
export const ChipPile = ({ amount }) => {
  const chips = chipList(amount);
  const stacks = [];
  chips.forEach((c) => {
    const s = stacks.find((x) => x.kind === c && x.items.length < 7);
    if (s) s.items.push(c);
    else if (stacks.length < 6) stacks.push({ kind: c, items: [c] });
    else stacks[stacks.length - 1].items.push(c);
  });
  return (
    <div className="sd-pile" aria-hidden="true">
      {stacks.map((s, i) => (
        <span key={i} className="sd-stack">
          {s.items.map((c, k) => <Chip key={k} kind={c} />)}
        </span>
      ))}
    </div>
  );
};

/** 이름 첫 글자 아바타 (색은 이름으로 정함) */
const Avatar = ({ name, me }) => {
  const hue = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);
  return (
    <span className={`sd-avatar${me ? ' is-me' : ''}`} style={{ '--hue': hue }} aria-hidden="true">
      {[...name][0] || '?'}
    </span>
  );
};

/**
 * 자리 하나 (판 둘레에 놓임).
 * seat: { index, name, chips, inHand, folded, last, isTurn, isDealer, choosing, timer,
 *         cards:[{ id, up, picked, dim, tag, revealed }], handText, revealIndex, win, payout }
 */
export const Seat = ({ seat, pos, me = false, dealKey }) => {
  const { t } = useTranslation();
  const cls = ['sd-seat', `sd-pos-${pos}`];
  if (me) cls.push('is-me');
  if (seat.isTurn || seat.choosing) cls.push('is-turn');
  if (seat.folded) cls.push('is-folded');
  if (seat.win) cls.push('is-win');
  if (!seat.inHand) cls.push('is-out');
  const revealDelay = seat.revealIndex >= 0 ? seat.revealIndex * REVEAL_GAP : 0;
  let bubble = null;
  if (seat.folded) bubble = t('seotda.acts.die');
  else if (seat.choosing) bubble = t('seotda.status.choosing');
  else if (seat.last) bubble = t(`seotda.acts.${seat.last}`);
  return (
    <div className={cls.join(' ')} data-seat={seat.index}>
      <div className="sd-seat-info">
        <Avatar name={seat.name} me={me} />
        <div className="sd-seat-text">
          <b className="sd-seat-name">{seat.name}</b>
          <span className="sd-seat-chips">{fmt(seat.chips)}P</span>
        </div>
        {seat.isDealer && <span className="sd-badge" title={t('seotda.dealer_desc')}>{t('seotda.dealer')}</span>}
        {bubble && !seat.handText && (
          <span key={`${bubble}-${seat.last}`} className={`sd-bubble${seat.folded ? ' is-die' : ''}`}>
            {bubble}{seat.isTurn && seat.timer != null ? ` ${seat.timer}` : ''}
          </span>
        )}
        {seat.isTurn && !bubble && seat.timer != null && <span className="sd-bubble is-timer">{seat.timer}</span>}
      </div>
      <div className="sd-seat-hand">
        {seat.inHand ? (
          <div className="sd-cards" key={dealKey}>
            {seat.cards.map((c, i) => (
              <span key={i} className="sd-deal" style={{ animationDelay: `${(seat.dealOrder ?? 0) * 110 + i * 330}ms` }}>
                <Card id={c.id} up={c.up} delay={c.revealed ? revealDelay : me ? 420 + i * 120 : 0} picked={c.picked} dim={c.dim} tag={c.tag} />
              </span>
            ))}
          </div>
        ) : <div className="sd-sitout">{t('seotda.sit_out')}</div>}
        {seat.handText && (
          <div className={`sd-hand${seat.win ? ' is-win' : ''}`} style={{ animationDelay: `${revealDelay + 350}ms` }}>
            {seat.handText}
            {seat.payout > 0 && <em>+{fmt(seat.payout)}</em>}
          </div>
        )}
      </div>
    </div>
  );
};

/** 내 자리 기준 상대 자리 위치 (판 둘레) */
const POSITIONS = { 0: [], 1: ['t'], 2: ['l', 'r'], 3: ['l', 't', 'r'] };

/**
 * 판: 상대는 둘레, 가운데 판돈 칩, 아래 내 자리.
 * bets: 이번 판 베팅 기록 [{ seat, pay }] (늘어날 때마다 칩이 가운데로 날아감)
 * payouts: { seat: 금액 } 결과가 나오면 payDelay 뒤에 칩이 이긴 사람에게 날아감
 */
export const Table = ({ view, mySeat, info, banner, bets = [], payouts = null, payDelay = 0, children }) => {
  const { t } = useTranslation();
  const tableRef = useRef(null);
  const potRef = useRef(null);
  const seenRef = useRef({ hand: null, bets: 0, paid: false });
  const [flights, setFlights] = useState([]);

  const n = view.seats.length;
  const start = mySeat >= 0 ? mySeat + 1 : 0;
  const others = [];
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if (i !== mySeat) others.push(view.seats[i]);
  }
  const positions = POSITIONS[others.length] || POSITIONS[3];
  const me = mySeat >= 0 ? view.seats[mySeat] : null;

  // 칩 날리기: 자리와 판돈의 화면 위치를 재서 그 사이를 움직인다
  useLayoutEffect(() => {
    const table = tableRef.current;
    const pot = potRef.current;
    if (!table || !pot) return;
    const seen = seenRef.current;
    if (seen.hand !== view.handNo) {
      // 처음 보는 판: 이미 지난 베팅은 날리지 않음 (재접속·관전 입장)
      seenRef.current = { hand: view.handNo, bets: seen.hand == null ? bets.length : 0, paid: false };
    }
    const tr = table.getBoundingClientRect();
    const center = (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2 - tr.left, y: r.top + r.height / 2 - tr.top };
    };
    const seatPoint = (i) => {
      const el = table.querySelector(`[data-seat="${i}"] .sd-avatar`);
      return el ? center(el) : null;
    };
    const p = center(pot);
    const add = [];
    for (let k = seenRef.current.bets; k < bets.length; k++) {
      const b = bets[k];
      const s = b.pay > 0 ? seatPoint(b.seat) : null;
      if (s) add.push({ id: `${view.handNo}-b${k}`, from: s, to: p, delay: 0, kind: b.pay >= 1000 ? 'c1k' : b.pay >= 500 ? 'c500' : 'c100', count: Math.min(4, 1 + Math.floor(b.pay / 500)) });
    }
    seenRef.current.bets = bets.length;
    if (payouts && !seenRef.current.paid) {
      seenRef.current.paid = true;
      Object.entries(payouts).forEach(([seat, v]) => {
        const s = v > 0 ? seatPoint(seat) : null;
        if (s) add.push({ id: `${view.handNo}-w${seat}`, from: p, to: s, delay: payDelay, kind: 'c1k', count: 6 });
      });
    }
    if (add.length > 0) setFlights((f) => [...f, ...add]);
  }, [bets, payouts, payDelay, view.handNo]);

  return (
    <div className={`sd-table sd-opps-${others.length}`} ref={tableRef} role="region" aria-label={t('seotda.table_label')}>
      <div className="sd-felt" aria-hidden="true" />
      {others.map((s, k) => <Seat key={s.key} seat={s} pos={positions[k] || 't'} dealKey={view.handNo} />)}

      <div className="sd-pot" ref={potRef} hidden={n === 0}>
        <ChipPile amount={view.pot} />
        <div className="sd-potbox">
          {info?.phase && <div className="sd-phase">{info.phase}</div>}
          <div><span>{t('seotda.pot')}</span><b>{fmt(view.pot)}P</b></div>
          {info?.toCall != null && <div><span>{t('seotda.call_cost')}</span><b>{fmt(info.toCall)}P</b></div>}
        </div>
      </div>

      {me && <Seat seat={me} pos="me" me dealKey={view.handNo} />}

      {flights.map((f) => (
        <span
          key={f.id}
          className="sd-fly"
          style={{ '--fx': `${f.from.x}px`, '--fy': `${f.from.y}px`, '--tx': `${f.to.x}px`, '--ty': `${f.to.y}px`, animationDelay: `${f.delay}ms` }}
          onAnimationEnd={() => setFlights((list) => list.filter((x) => x.id !== f.id))}
        >
          {Array.from({ length: f.count }, (_, k) => <Chip key={k} kind={f.kind} />)}
        </span>
      ))}

      {banner && (
        <div key={banner.key} className={`sd-banner is-${banner.tone}`} style={{ animationDelay: `${banner.delay || 0}ms` }} role="status">
          <strong>{banner.title}</strong>
          {banner.sub && <span>{banner.sub}</span>}
        </div>
      )}
      {children}
    </div>
  );
};

/* 베팅 버튼: 실제 앱처럼 화면 아래 한 줄 (할 수 없는 것은 흐리게) */
const SLOTS = ['die', 'check', 'bbing', 'call', 'ddadang', 'quarter', 'half'];

export const BetBar = ({ acts, onAct, disabled = false }) => {
  const { t } = useTranslation();
  return (
    <div className="sd-betbar" role="group" aria-label={t('seotda.bet_label')}>
      {SLOTS.map((type) => {
        const a = disabled ? null : acts.find((x) => x.type === type);
        return (
          <button key={type} type="button" className={`sd-bet sd-bet-${type}`} disabled={!a} onClick={() => a && onAct(type)}>
            <b>{t(`seotda.acts.${type}`)}</b>
            <small>{a && a.pay > 0 ? fmt(a.pay) : ' '}</small>
          </button>
        );
      })}
    </div>
  );
};

/** 3장 섯다: 공개할 패 고르기 (아래 줄에 표시) */
export const OpenPicker = ({ cards, onPick }) => {
  const { t } = useTranslation();
  return (
    <div className="sd-chooser">
      <span className="sd-chooser-title">{t('seotda.open_title')}</span>
      <div className="sd-chooser-row">
        {cards.slice(0, 2).map((id, k) => (
          <button key={k} type="button" className="sd-pick-card" onClick={() => onPick(k)} aria-label={t('seotda.open_this')}>
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
      <span className="sd-chooser-title">{t('seotda.select_title')}</span>
      <div className="sd-chooser-row">
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

/** 결과 줄 (아래 줄에 표시, 패를 다 뒤집은 뒤 나타남) */
export const ResultBar = ({ lines, change, delay = 0, children }) => {
  const { t } = useTranslation();
  return (
    <div className="sd-resultbar" style={{ animationDelay: `${delay}ms` }}>
      <div className="sd-resultbar-text">
        {lines.map((l, i) => <span key={i}>{l}</span>)}
        {change != null && (
          <b className={change > 0 ? 'up' : change < 0 ? 'down' : ''}>
            {t('seotda.result.change', { n: `${change > 0 ? '+' : ''}${fmt(change)}` })}
          </b>
        )}
      </div>
      <div className="sd-resultbar-actions">{children}</div>
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
