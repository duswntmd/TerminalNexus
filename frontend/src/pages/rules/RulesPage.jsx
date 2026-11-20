import React, { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { RULE_GUIDES, findGuide } from '../../content/rules';
import HwatuCard from '../../components/hwatu/HwatuCard';
import { CARDS, MONTH_NAMES_KO, cardLabel } from '../../components/hwatu/cards';
import { classify, handLabel, toHwatuId, PAIRS_OF_THREE } from '../play/seotda/engine';
import { scoreOf } from '../play/gostop/engine';
import AdSlot from '../../components/AdSlot';
import ShareBar from '../../components/ShareBar';
import '../learn/Learn.css';
import './Rules.css';

const SITE = 'https://tnhub.kr';

/* ───────────── 공통 블록 ───────────── */

const Table = ({ head, rows }) => (
  <div className="ru-table-wrap">
    <table className="ru-table">
      <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => (i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>))}</tr>)}</tbody>
    </table>
  </div>
);

/** 오목 판 일부 그림. rows: X 흑, O 백, * 설명 자리 */
const OmokDiagram = ({ rows, verdict, note }) => {
  const C = 34;
  const P = 22;
  const w = rows[0].length;
  const h = rows.length;
  const stones = [];
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') stones.push({ ch, x, y }); }));
  return (
    <figure className="ru-omok">
      <svg viewBox={`0 0 ${P * 2 + C * (w - 1)} ${P * 2 + C * (h - 1)}`} role="img" aria-label={note}>
        <defs>
          <radialGradient id="ru-b" cx="35%" cy="30%" r="70%"><stop offset="0" stopColor="#666" /><stop offset="1" stopColor="#0b0b0b" /></radialGradient>
          <radialGradient id="ru-w" cx="35%" cy="30%" r="75%"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#c9c4b8" /></radialGradient>
        </defs>
        <rect width="100%" height="100%" rx="8" fill="#dcae62" />
        {Array.from({ length: w }, (_, x) => <line key={`v${x}`} x1={P + x * C} y1={P - 10} x2={P + x * C} y2={P + (h - 1) * C + 10} stroke="#6b4a1f" strokeWidth="1" />)}
        {Array.from({ length: h }, (_, y) => <line key={`h${y}`} x1={P - 10} y1={P + y * C} x2={P + (w - 1) * C + 10} y2={P + y * C} stroke="#6b4a1f" strokeWidth="1" />)}
        {stones.map(({ ch, x, y }) => {
          const cx = P + x * C;
          const cy = P + y * C;
          if (ch === 'X') return <circle key={`${x}-${y}`} cx={cx} cy={cy} r={C * 0.44} fill="url(#ru-b)" />;
          if (ch === 'O') return <circle key={`${x}-${y}`} cx={cx} cy={cy} r={C * 0.44} fill="url(#ru-w)" stroke="#8d8676" strokeWidth="0.8" />;
          return verdict
            ? <g key="t" stroke="#e0281b" strokeWidth="4" strokeLinecap="round"><line x1={cx - 9} y1={cy - 9} x2={cx + 9} y2={cy + 9} /><line x1={cx + 9} y1={cy - 9} x2={cx - 9} y2={cy + 9} /></g>
            : <circle key="t" cx={cx} cy={cy} r={C * 0.4} fill="none" stroke="#1d8f3a" strokeWidth="4" />;
        })}
      </svg>
      <figcaption>{verdict ? '✕ ' : '○ '}{note}</figcaption>
    </figure>
  );
};

/* ───────────── 화투 ───────────── */

const HwatuGrid = () => (
  <div className="ru-hwatu">
    {MONTH_NAMES_KO.map((name, m) => (
      <div className="ru-month" key={name}>
        <strong>{m + 1}월 <span>{name}</span></strong>
        <div className="ru-month-cards">
          {CARDS.filter((c) => c.month === m + 1).map((c) => (
            <figure key={c.id}>
              <HwatuCard id={c.id} />
              <figcaption>{cardLabel(c.id).replace(`${m + 1}월 `, '')}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    ))}
  </div>
);

/* ───────────── 섯다 ───────────── */

// 섯다 번호: 월 m의 첫 장 (m-1)*2, 둘째 장 (m-1)*2+1
const S = (m, second = 0) => (m - 1) * 2 + second;
const RANK_EXAMPLES = [
  ['38광땡', [S(3), S(8)]],
  ['18광땡', [S(1), S(8)]],
  ['13광땡', [S(1), S(3)]],
  ['장땡', [S(10), S(10, 1)]],
  ['9땡', [S(9), S(9, 1)]],
  ['삥땡', [S(1), S(1, 1)]],
  ['알리', [S(1, 1), S(2)]],
  ['독사', [S(1, 1), S(4, 1)]],
  ['구삥', [S(1, 1), S(9, 1)]],
  ['장삥', [S(1, 1), S(10, 1)]],
  ['장사', [S(4, 1), S(10, 1)]],
  ['세륙', [S(4, 1), S(6)]],
  ['갑오', [S(2, 1), S(7, 1)]],
  ['망통', [S(2, 1), S(8, 1)]],
];
const SPECIAL_EXAMPLES = [
  ['암행어사', [S(4), S(7)]],
  ['땡잡이', [S(3), S(7)]],
  ['구사', [S(4, 1), S(9, 1)]],
  ['멍텅구리구사', [S(4), S(9)]],
];

const Pair = ({ name, cards, rank }) => (
  <li className="ru-pair">
    {rank != null && <span className="ru-rank">{rank}</span>}
    <span className="ru-pair-cards">{cards.map((c) => <HwatuCard key={c} id={toHwatuId(c)} marks={false} />)}</span>
    <strong>{name}</strong>
  </li>
);

const SeotdaRanks = () => (
  <>
    <ol className="ru-pairs">{RANK_EXAMPLES.map(([n, c], i) => <Pair key={n} name={n} cards={c} rank={i + 1} />)}</ol>
    <p className="ru-caption">특수패</p>
    <ul className="ru-pairs is-special">{SPECIAL_EXAMPLES.map(([n, c]) => <Pair key={n} name={n} cards={c} />)}</ul>
  </>
);

const SPECIAL_NOTE = {
  amhaeng: '상대가 18·13광땡이면 이기고, 아니면 1끗',
  ttaengjabi: '상대가 1~9땡이면 이기고, 아니면 망통',
  gusa: '다른 사람 최고 패가 알리 이하면 재경기, 아니면 3끗',
  mgusa: '다른 사람 최고 패가 9땡 이하면 재경기, 아니면 3끗',
};

const SeotdaChecker = () => {
  const { t } = useTranslation();
  const [picked, setPicked] = useState([]);
  const name = (h) => {
    const l = handLabel(h);
    return t(`seotda.hands.${l.key}`, { n: l.n, kkut: l.kkut });
  };
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= 3 ? p : [...p, id]));
  const pairs = picked.length === 3 ? PAIRS_OF_THREE.map(([a, b]) => [picked[a], picked[b]]) : picked.length === 2 ? [picked] : [];
  const results = pairs.map((p) => ({ p, h: classify(p[0], p[1]) })).sort((a, b) => b.h.base - a.h.base);
  return (
    <section className="ru-widget" aria-labelledby="ru-sc-title">
      <h2 id="ru-sc-title">족보 확인기</h2>
      <p className="ru-hint">카드를 2장(2장 섯다) 또는 3장(3장 섯다) 고르면 족보를 알려 줍니다.</p>
      <div className="ru-pick20">
        {Array.from({ length: 20 }, (_, id) => (
          <button key={id} type="button" className={picked.includes(id) ? 'is-on' : ''} onClick={() => toggle(id)}
            aria-pressed={picked.includes(id)} aria-label={cardLabel(toHwatuId(id))}>
            <HwatuCard id={toHwatuId(id)} marks={false} />
          </button>
        ))}
      </div>
      <div className="ru-result" aria-live="polite">
        {results.length === 0 && <p>{picked.length === 1 ? '한 장 더 고르세요.' : '카드를 고르세요.'}</p>}
        {results.map(({ p, h }, i) => (
          <p key={p.join('-')} className={i === 0 ? 'is-best' : ''}>
            {cardLabel(toHwatuId(p[0]))} + {cardLabel(toHwatuId(p[1]))}: <strong>{name(h)}</strong>
            {h.special && <span className="ru-sub"> ({SPECIAL_NOTE[h.special]})</span>}
            {i === 0 && results.length > 1 && <span className="ru-badge">가장 셈</span>}
          </p>
        ))}
        {picked.length > 0 && <button type="button" className="ru-btn" onClick={() => setPicked([])}>다시 고르기</button>}
      </div>
    </section>
  );
};

/* ───────────── 고스톱 계산기 ───────────── */

const Num = ({ label, value, onChange, min = 0, max = 30 }) => (
  <label className="ru-num">
    <span>{label}</span>
    <span className="ru-stepper">
      <button type="button" onClick={() => onChange((v) => Math.max(min, v - 1))} aria-label={`${label} 줄이기`}>−</button>
      <output>{value}</output>
      <button type="button" onClick={() => onChange((v) => Math.min(max, v + 1))} aria-label={`${label} 늘리기`}>+</button>
    </span>
  </label>
);

const GostopCalculator = () => {
  const { t } = useTranslation();
  const [cap, setCap] = useState([]);
  const [go, setGo] = useState(0);
  const [shake, setShake] = useState(0);
  const [oppPi, setOppPi] = useState(10);
  const [oppGwang, setOppGwang] = useState(1);
  const [oppGo, setOppGo] = useState(false);
  const toggle = (id) => setCap((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  const r = useMemo(() => {
    const s = scoreOf(cap);
    const base = s.total + go;
    const muls = [];
    if (go >= 3) muls.push([`${go}고`, 2 ** (go - 2)]);
    if (shake) muls.push([`흔들기·폭탄 ${shake}번`, 2 ** shake]);
    if (s.counts.yeol >= 7) muls.push(['멍따', 2]);
    if (s.pi > 0 && oppPi <= 7) muls.push(['피박', 2]);
    if (s.gwang > 0 && oppGwang === 0) muls.push(['광박', 2]);
    if (oppGo) muls.push(['고박', 2]);
    return { s, base, muls, final: muls.reduce((n, [, x]) => n * x, base) };
  }, [cap, go, shake, oppPi, oppGwang, oppGo]);

  return (
    <section className="ru-widget" aria-labelledby="ru-gc-title">
      <h2 id="ru-gc-title">고스톱 점수 계산기</h2>
      <p className="ru-hint">이긴 사람이 먹은 패를 누르고, 아래에서 고 횟수와 상대 상황을 정하면 최종 점수를 계산합니다. 9월 국진은 점수가 높은 쪽(열끗 또는 쌍피)으로 자동 계산합니다.</p>
      <div className="ru-pick48">
        {MONTH_NAMES_KO.map((name, m) => (
          <div key={name} className="ru-pick-month">
            <span>{m + 1}월</span>
            {CARDS.filter((c) => c.month === m + 1).map((c) => (
              <button key={c.id} type="button" className={cap.includes(c.id) ? 'is-on' : ''} onClick={() => toggle(c.id)}
                aria-pressed={cap.includes(c.id)} aria-label={cardLabel(c.id)}>
                <HwatuCard id={c.id} />
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="ru-opts">
        <Num label="고 횟수" value={go} onChange={setGo} max={10} />
        <Num label="흔들기·폭탄" value={shake} onChange={setShake} max={4} />
        <Num label="상대 피 장수" value={oppPi} onChange={setOppPi} />
        <Num label="상대 광 장수" value={oppGwang} onChange={setOppGwang} max={5} />
        <label className="ru-check"><input type="checkbox" checked={oppGo} onChange={(e) => setOppGo(e.target.checked)} /> 상대가 고를 했음 (고박)</label>
      </div>
      <div className="ru-result" aria-live="polite">
        <p className="ru-counts">
          광 {r.s.counts.gwang} · 열끗 {r.s.counts.yeol} · 띠 {r.s.counts.tti} · 피 {r.s.counts.pi}
          {r.s.gukjin && <span className="ru-sub"> (국진을 {r.s.gukjin === 'pi' ? '쌍피' : '열끗'}로 계산)</span>}
        </p>
        <ul className="ru-items">
          {r.s.items.length === 0 && <li>아직 점수가 되는 족보가 없습니다.</li>}
          {r.s.items.map(([k, v]) => <li key={k}>{t(`gostop.score_items.${k}`)} <b>{v}점</b></li>)}
          {go > 0 && <li>{go}고 가산 <b>+{go}점</b></li>}
        </ul>
        <p>기본 점수 <b>{r.base}점</b>{r.muls.map(([k, x]) => <span key={k}> × {x} <span className="ru-sub">({k})</span></span>)}</p>
        <p className="ru-final">최종 <b>{r.final}점</b></p>
        {r.s.total < 7 && cap.length > 0 && <p className="ru-sub">맞고에서는 족보 점수가 7점 이상이어야 날 수 있습니다 (지금 {r.s.total}점).</p>}
        {cap.length > 0 && <button type="button" className="ru-btn" onClick={() => setCap([])}>먹은 패 비우기</button>}
      </div>
    </section>
  );
};

const WIDGETS = {
  'hwatu-grid': HwatuGrid,
  'seotda-ranks': SeotdaRanks,
  'seotda-checker': SeotdaChecker,
  'gostop-calculator': GostopCalculator,
};

const Block = ({ block }) => {
  if (block.h) return <h2>{block.h}</h2>;
  if (block.list) return <ul>{block.list.map((item) => <li key={item}>{item}</li>)}</ul>;
  if (block.table) return <Table {...block.table} />;
  if (block.omok) return <OmokDiagram {...block.omok} />;
  if (block.widget) {
    const W = WIDGETS[block.widget];
    return W ? <W /> : null;
  }
  return <p>{block.p}</p>;
};

/* ───────────── 페이지 ───────────── */

const RulesIndex = () => {
  const { t } = useTranslation();
  return (
    <>
      <Helmet>
        <title>{t('rules.meta_title')}</title>
        <meta name="description" content={t('rules.meta_desc')} />
        <link rel="canonical" href={`${SITE}/rules`} />
      </Helmet>
      <header className="ln-head">
        <h1>{t('rules.title')}</h1>
        <p>{t('rules.subtitle')}</p>
      </header>
      <ul className="ln-list">
        {RULE_GUIDES.map((g) => (
          <li key={g.slug}>
            <Link to={`/rules/${g.slug}`}>
              <strong>{g.title}</strong>
              <span>{g.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
};

const RulesGuide = ({ guide }) => {
  const { t } = useTranslation();
  const others = RULE_GUIDES.filter((g) => g.slug !== guide.slug);
  return (
    <article>
      <Helmet>
        <title>{`${guide.title} | TerminalNexus`}</title>
        <meta name="description" content={guide.desc} />
        <link rel="canonical" href={`${SITE}/rules/${guide.slug}`} />
      </Helmet>
      <nav className="ln-crumb" aria-label={t('rules.title')}>
        <Link to="/rules">{t('rules.title')}</Link>
      </nav>
      <header className="ln-head">
        <h1>{guide.title}</h1>
        <p>{guide.desc}</p>
        <p className="ln-meta">{t('learn.byline', { date: guide.date })}</p>
      </header>
      <div className="ln-body">
        {guide.body.map((block, i) => <Block key={i} block={block} />)}
        {guide.faq?.length > 0 && (
          <section className="ru-faq">
            <h2>자주 묻는 질문</h2>
            {guide.faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>
        )}
      </div>
      <Link to={guide.game} className="ln-tool">
        <span>{t('rules.play', { name: guide.gameName })}</span>
        <span aria-hidden="true">→</span>
      </Link>
      {(guide.slug === 'hwatu-cards' || guide.slug === 'seotda-jokbo' || guide.slug === 'gostop-score') && (
        <p className="ru-credit">
          <a href="https://commons.wikimedia.org/wiki/Category:SVG_Hwatu" target="_blank" rel="noopener noreferrer">{t('gostop.card_credit')}</a>
          {' · '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ko" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
        </p>
      )}
      <ShareBar path={`/rules/${guide.slug}`} text={guide.title} />
      <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_ARTICLE} />
      <nav className="ln-more" aria-label={t('rules.more')}>
        <h2>{t('rules.more')}</h2>
        {others.map((g) => <Link key={g.slug} to={`/rules/${g.slug}`}>{g.title}</Link>)}
      </nav>
    </article>
  );
};

const RulesPage = () => {
  const { slug } = useParams();
  const guide = slug ? findGuide(slug) : null;
  if (slug && !guide) return <Navigate to="/rules" replace />;
  return <div className="ln-page ru-page">{guide ? <RulesGuide guide={guide} /> : <RulesIndex />}</div>;
};

export default RulesPage;
