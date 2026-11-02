import React, { useMemo, useState } from 'react';
import { Link, NavLink, Navigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import {
  ARC, ARC_PAGES, ARC_TYPES, CHECKED, CONDITIONS, FACTS, LOOP, MAPS, SOURCES, SYSTEMS, TIPS, UPDATES, UPDATE_KINDS,
} from '../../content/arcRaiders';
import AdSlot from '../../components/AdSlot';
import ShareBar from '../../components/ShareBar';
import './ArcRaiders.css';

const BASE = '/games/arc-raiders';

// 항목별 출처 링크 묶음
const Src = ({ ids, note }) => (
  <span className="ar-src">
    {ids.map((id) => <a key={id} href={SOURCES[id].url} target="_blank" rel="noopener noreferrer">{SOURCES[id].name}</a>)}
    {note && <em>{note}</em>}
  </span>
);

// 섹션 끝의 출처와 확인일
const SectionFoot = ({ ids }) => {
  const { t } = useTranslation();
  const uniq = [...new Set(ids)];
  return (
    <footer className="ar-foot">
      <span>{t('arc.checked', { date: CHECKED })}</span>
      <span>{t('arc.sources')}: </span>
      <Src ids={uniq} />
    </footer>
  );
};

const Overview = () => {
  const { t } = useTranslation();
  return (
    <>
      <section className="ar-sec">
        <h2>{t('arc.facts_title')}</h2>
        <dl className="ar-facts">
          {FACTS.map((f) => (
            <div key={f.k}>
              <dt>{f.k}</dt>
              <dd>{f.v}{f.note && <small>{f.note}</small>}</dd>
            </div>
          ))}
        </dl>
        <SectionFoot ids={FACTS.flatMap((f) => f.src)} />
      </section>

      <section className="ar-sec">
        <h2>{t('arc.loop_title')}</h2>
        <ol className="ar-loop">
          {LOOP.map((l, i) => (
            <li key={l.step}><span className="ar-step">{i + 1}</span><div><strong>{l.step}</strong><p>{l.text}</p></div></li>
          ))}
        </ol>
        <SectionFoot ids={['guide', 'wiki']} />
      </section>

      <section className="ar-sec">
        <h2>{t('arc.systems_title')}</h2>
        <div className="ar-cards">
          {SYSTEMS.map((s) => (
            <article key={s.name} className="ar-card">
              <h3>{s.name}</h3>
              <p>{s.text}</p>
              <Src ids={s.src} note={s.note} />
            </article>
          ))}
        </div>
        <SectionFoot ids={SYSTEMS.flatMap((s) => s.src)} />
      </section>

      <section className="ar-sec">
        <h2>{t('arc.tips_title')}</h2>
        <ul className="ar-tips">
          {TIPS.map((tip) => <li key={tip.h}><strong>{tip.h}</strong><p>{tip.p}</p></li>)}
        </ul>
        <SectionFoot ids={TIPS.flatMap((tip) => tip.src)} />
      </section>
    </>
  );
};

const Maps = () => {
  const { t } = useTranslation();
  return (
    <>
      <section className="ar-sec">
        <h2>{t('arc.maps_title')}</h2>
        <div className="ar-cards">
          {MAPS.map((m, i) => (
            <article key={m.name} className="ar-card">
              <div className="ar-card-top"><span className="ar-idx">{String(i + 1).padStart(2, '0')}</span><span className="ar-chip">{m.update}</span></div>
              <h3>{m.name}</h3>
              <p className="ar-sub">{m.ko} · {t('arc.added', { date: m.added })}</p>
              <p>{m.text}</p>
              {m.keys.length > 0 && <p className="ar-keys"><b>{t('arc.keys')}</b> {m.keys.join(', ')}</p>}
              <Src ids={m.src} />
            </article>
          ))}
        </div>
        <p className="ar-hint">{t('arc.keys_hint')}</p>
        <SectionFoot ids={MAPS.flatMap((m) => m.src)} />
      </section>
      <section className="ar-sec">
        <h2>{t('arc.conditions_title')}</h2>
        <div className="ar-table-wrap">
          <table className="ar-table">
            <thead><tr><th>{t('arc.col_name')}</th><th>{t('arc.col_desc')}</th></tr></thead>
            <tbody>
              {CONDITIONS.map((c) => (
                <tr key={c.name}><td>{c.name}</td><td>{c.text}{c.note && <small>{c.note}</small>}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <SectionFoot ids={CONDITIONS.flatMap((c) => c.src)} />
      </section>
    </>
  );
};

const Enemies = () => {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [since, setSince] = useState('');
  const sinces = useMemo(() => [...new Set(ARC.map((a) => a.since))], []);
  const rows = ARC.filter((a) => (!type || a.type === type) && (!since || a.since === since)
    && (!q || `${a.name} ${a.text}`.toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <section className="ar-sec">
      <h2>{t('arc.arc_title')}</h2>
      <div className="ar-filters">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('arc.search')} aria-label={t('arc.search')} />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label={t('arc.col_type')}>
          <option value="">{t('arc.col_type')}: {t('arc.all')}</option>
          {ARC_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select value={since} onChange={(e) => setSince(e.target.value)} aria-label={t('arc.col_since')}>
          <option value="">{t('arc.col_since')}: {t('arc.all')}</option>
          {sinces.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
      <p className="ar-count">{t('arc.count', { n: rows.length, total: ARC.length })}</p>
      <div className="ar-table-wrap">
        <table className="ar-table ar-arc">
          <thead>
            <tr><th>{t('arc.col_name')}</th><th>{t('arc.col_type')}</th><th>{t('arc.col_threat')}</th><th>{t('arc.col_armor')}</th><th>{t('arc.col_since')}</th><th>{t('arc.col_desc')}</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.name}>
                <td data-label={t('arc.col_name')}><strong>{a.name}</strong></td>
                <td data-label={t('arc.col_type')}>{a.type}</td>
                <td data-label={t('arc.col_threat')}>{a.threat}</td>
                <td data-label={t('arc.col_armor')}>{a.armor}</td>
                <td data-label={t('arc.col_since')}>{a.since}</td>
                <td data-label={t('arc.col_desc')}>{a.text || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="ar-empty">{t('arc.empty')}</p>}
      </div>
      <p className="ar-hint">{t('arc.arc_hint')}</p>
      <SectionFoot ids={ARC.flatMap((a) => a.src)} />
    </section>
  );
};

const Updates = () => {
  const { t } = useTranslation();
  const [kind, setKind] = useState('');
  const rows = [...UPDATES].reverse().filter((u) => !kind || u.kind === kind);
  return (
    <section className="ar-sec">
      <h2>{t('arc.updates_title')}</h2>
      <div className="ar-seg" role="group" aria-label={t('arc.updates_title')}>
        {['', ...UPDATE_KINDS].map((k) => (
          <button key={k || 'all'} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
            {k ? t(`arc.kind_${k}`) : t('arc.all')}
          </button>
        ))}
      </div>
      <ol className="ar-timeline">
        {rows.map((u) => (
          <li key={u.date + u.name} className={`k-${u.kind}`}>
            <time dateTime={u.date}>{u.date}</time>
            <div>
              <strong>{u.name}</strong> <span className="ar-chip">{t(`arc.kind_${u.kind}`)}</span>
              <p>{u.text}</p>
              <Src ids={u.src} note={u.note} />
            </div>
          </li>
        ))}
      </ol>
      <SectionFoot ids={UPDATES.flatMap((u) => u.src)} />
    </section>
  );
};

const VIEWS = { '': Overview, maps: Maps, arc: Enemies, updates: Updates };

const ArcRaidersPage = () => {
  const { t } = useTranslation();
  const { section = '' } = useParams();
  const page = ARC_PAGES.find((p) => p.id === section);
  if (!page) return <Navigate to={BASE} replace />;
  const View = VIEWS[page.id];
  const path = page.id ? `${BASE}/${page.id}` : BASE;
  return (
    <div className="ar-page">
      <Helmet>
        <title>{`${page.title} | TerminalNexus`}</title>
        <meta name="description" content={page.desc} />
        <link rel="canonical" href={`https://tnhub.kr${path}`} />
      </Helmet>
      <p className="ar-notice" role="note">{t('arc.disclaimer')}</p>
      <header className="ar-head">
        <span className="ar-mark" aria-hidden="true">AR</span>
        <div>
          <h1>{page.title}</h1>
          <p>{page.desc}</p>
          <p className="ar-meta">{t('arc.byline', { date: CHECKED })}</p>
        </div>
      </header>
      <nav className="ar-tabs" aria-label={t('arc.tabs')}>
        {ARC_PAGES.map((p) => (
          <NavLink key={p.id} to={p.id ? `${BASE}/${p.id}` : BASE} end>{p.short}</NavLink>
        ))}
      </nav>
      <View />
      <ShareBar path={path} text={page.title} />
      <AdSlot slot={import.meta.env.VITE_ADSENSE_SLOT_ARTICLE} />
      <p className="ar-more">{t('arc.report')} <Link to="/about">{t('arc.report_link')}</Link></p>
    </div>
  );
};

export default ArcRaidersPage;
