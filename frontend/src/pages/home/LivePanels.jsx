import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ballColor, pickNumbers, rankOf } from '../lotto/lottoUtils';

const API = import.meta.env.VITE_BACKEND_API_BASE_URL || '/api';

function useAgo() {
  const { t } = useTranslation();
  return (iso) => {
    if (!iso) return '';
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return t('home.just_now');
    if (s < 3600) return t('home.ago_min', { n: Math.floor(s / 60) });
    if (s < 86400) return t('home.ago_hour', { n: Math.floor(s / 3600) });
    if (s < 86400 * 30) return t('home.ago_day', { n: Math.floor(s / 86400) });
    return new Date(iso).toLocaleDateString();
  };
}

function Panel({ title, more, moreTo, children, live }) {
  return (
    <section className="panel">
      <header className="panel-head">
        <h3>{live && <span className="tn-led" aria-hidden="true" />}{title}</h3>
        {more && <Link to={moreTo} className="panel-more">{more}</Link>}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

export function PostsPanel() {
  const { t } = useTranslation();
  const ago = useAgo();
  const [posts, setPosts] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch(`${API}/freeboard?page=1&size=5`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setPosts((d.dtoList || []).slice(0, 5)))
      .catch(() => setErr(true));
  }, []);
  return (
    <Panel title={t('home.posts')} more={t('home.posts_more')} moreTo="/freeboard">
      {err ? <p className="panel-empty">{t('home.posts_error')}</p>
        : posts === null ? <ul className="post-list">{Array.from({ length: 5 }, (_, i) => <li key={i} className="skeleton" />)}</ul>
        : posts.length === 0 ? (
          <div className="panel-empty">
            <p>{t('home.posts_empty')}</p>
            <Link to="/freeboard/register" className="tn-btn tn-btn-ghost">{t('home.posts_write')}</Link>
          </div>
        ) : (
          <ul className="post-list">
            {posts.map((p) => (
              <li key={p.id}>
                <Link to={`/freeboard/${p.id}`} className="post">
                  <span className="post-title">
                    <span className="post-title-text">{p.title}</span>
                    {p.commentCount > 0 && <span className="post-cc" aria-label={`댓글 ${p.commentCount}`}>[{p.commentCount}]</span>}
                  </span>
                  <span className="post-meta"><span>{p.writerNickname}</span><span>{ago(p.regDate)}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
    </Panel>
  );
}

export function StockPanel() {
  const { t } = useTranslation();
  const [list, setList] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (document.hidden) return;
      try {
        const r = await fetch(`${API}/stock/prices`);
        if (!r.ok) throw new Error();
        const d = await r.json();
        if (alive) { setList(d.slice(0, 4)); setErr(false); }
      } catch { if (alive && list === null) setErr(true); }
    };
    load();
    const id = setInterval(load, 5000);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Panel title={t('home.stock')} more={t('home.stock_more')} moreTo="/play/stock" live={!!list?.length}>
      {err && !list ? <p className="panel-empty">{t('home.stock_closed')}</p>
        : !list ? <p className="panel-empty">{t('home.stock_wait')}</p>
        : (
          <ul className="ticker-list">
            {list.map((s) => {
              const dir = s.changeAmount > 0 ? 'up' : s.changeAmount < 0 ? 'down' : 'flat';
              return (
                <li key={s.ticker}>
                  <Link to="/play/stock" className="ticker">
                    <span className="ticker-name">{s.name}<code>{s.ticker}</code></span>
                    <span className={`ticker-price ${dir}`}>{s.currentPrice.toLocaleString()}</span>
                    <span className={`ticker-chg ${dir}`}>{dir === 'up' ? '▲' : dir === 'down' ? '▼' : '–'} {Math.abs(s.changeRate).toFixed(2)}%</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
    </Panel>
  );
}

const Ball = ({ n, hit, show = true }) => (
  <span className={`ball ${show ? 'in' : ''} ${hit ? 'hit' : ''}`} style={{ '--c': ballColor(n) }}>{n}</span>
);

export function LottoPanel() {
  const { t } = useTranslation();
  const [latest, setLatest] = useState(undefined);
  const [mine, setMine] = useState([]);
  const [shown, setShown] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch(`${API}/lotto/latest`).then((r) => (r.status === 200 ? r.json() : null)).then((d) => setLatest(d && d.numbers ? d : null)).catch(() => setLatest(null));
  }, []);
  const draw = () => {
    if (busy) return;
    const nums = pickNumbers();
    setMine(nums); setShown(0); setBusy(true);
    nums.forEach((_, i) => setTimeout(() => { setShown(i + 1); if (i === 5) setBusy(false); }, 140 * (i + 1)));
  };
  const done = mine.length === 6 && shown >= 6;
  const rank = done && latest ? rankOf(mine, latest) : 0;
  const hits = done && latest ? mine.filter((n) => latest.numbers.includes(n)).length : 0;
  return (
    <Panel title={latest ? `${t('home.lotto')} ${latest.drwNo}회` : t('home.lotto')} more={t('home.lotto_more')} moreTo="/lotto">
      {latest === undefined ? <div className="balls skeleton-row" />
        : latest === null ? <p className="panel-empty">{t('home.lotto_none')}</p>
        : (
          <>
            <div className="balls" aria-label={`${latest.drwNo}회 당첨번호 ${latest.numbers.join(', ')} 보너스 ${latest.bonus}`}>
              {latest.numbers.map((n) => <Ball key={n} n={n} />)}
              <span className="ball-plus" aria-hidden="true">+</span>
              <Ball n={latest.bonus} />
            </div>
            <p className="lotto-date">{latest.date}</p>
          </>
        )}
      <div className="lotto-mine">
        <div className="lotto-mine-head">
          <span>{t('home.lotto_mine')}</span>
          <button type="button" className="tn-btn tn-btn-primary lotto-draw" onClick={draw} disabled={busy}>
            {busy ? t('main.lotto.drawing') : mine.length ? t('main.lotto.redraw') : t('main.lotto.draw')}
          </button>
        </div>
        <div className="balls mine" aria-live="polite">
          {mine.length
            ? mine.map((n, i) => <Ball key={`${n}-${i}`} n={n} show={i < shown} hit={done && latest?.numbers.includes(n)} />)
            : Array.from({ length: 6 }, (_, i) => <span key={i} className="ball empty" />)}
        </div>
        {done && latest && (
          <p className={`lotto-result ${rank ? 'win' : ''}`}>
            {rank ? t('main.lotto.compare_win', { no: latest.drwNo, count: hits, rank }) : t('main.lotto.compare_lose', { no: latest.drwNo, count: hits })}
          </p>
        )}
      </div>
    </Panel>
  );
}
