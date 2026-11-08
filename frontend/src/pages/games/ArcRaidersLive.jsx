// ARC Raiders 실시간 화면: 맵 조건(이벤트) 타이머, 상인 재고, 아이템 DB, 퀘스트 필요 아이템
// 데이터는 이 사이트 서버(/api/arc/*)가 MetaForge 공개 API를 받아 캐시한 것을 쓴다.
// MetaForge 이용 조건에 따라 모든 화면에 출처 링크를 표시한다.
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BASE, RARITY_KO } from '../../content/arcRaidersDb';

export const LIVE_SOURCE = 'https://metaforge.app/arc-raiders';

const MAP_KO = {
  Dam: '댐 배틀그라운드', Spaceport: '스페이스포트', 'Buried City': '버리드 시티', 'Blue Gate': '블루 게이트',
  'Stella Montis': '스텔라 몬티스', 'Riven Tides': '리븐 타이즈', 'Pendola Pass': '펜돌라 패스',
};
const MAP_ORDER = Object.keys(MAP_KO);

// 이벤트 한 줄 설명 (직접 요약)
const EVENT_INFO = {
  'Night Raid': { ko: '야간 습격', tier: 'major', text: '어두운 밤 판. ARC 활동이 늘고 보상 가치가 오르며, 레이더 해치가 닫히고 귀환 지점이 줄어든다.' },
  'Electromagnetic Storm': { ko: '전자기 폭풍', tier: 'major', text: '낙뢰가 떨어져 피해를 준다. 보상 가치가 오르고 레이더 해치가 닫힌다.' },
  'Hidden Bunker': { ko: '숨겨진 벙커', tier: 'major', text: '스페이스포트 외곽 벙커가 열린다. 옥상 안테나를 켜고 벙커 자료를 회수한다. 입구 길목에서 교전이 잦다.' },
  'Locked Gate': { ko: '잠긴 문', tier: 'major', text: '블루 게이트 비상 봉쇄. 보안 코드를 모아 문을 열면 고급 보상이 있다.' },
  'ARC Frigate': { ko: 'ARC 프리깃', tier: 'major', text: '거대한 ARC 함선에 올라 장치를 망가뜨리고 고급 보상을 들고 나온다. 장비를 갖춘 분대 권장.' },
  'Close Scrutiny': { ko: '집중 감시', tier: 'major', text: '감시 드론과 Snitch가 크게 늘어 들키지 않고 움직이기 어렵다.' },
  'Cold Snap': { ko: '한파', tier: 'major', text: '기온이 떨어져 추위 노출을 관리해야 한다.' },
  Hurricane: { ko: '허리케인', tier: 'major', text: '폭우와 강풍으로 시야와 소리가 줄어든다. 움직임을 숨기기 좋다.' },
  Matriarch: { ko: '매트리아크', tier: 'minor', text: '맵을 돌아다니는 대형 ARC 보스. 중탄약과 폭발물, 분대 협동이 필요하다.' },
  Harvester: { ko: '하베스터', tier: 'minor', text: 'ARC Queen이 지키는 거대 구조물. 내부 화염 주기를 피해 고급 보상과 전설 설계도를 노린다.' },
  'Prospecting Probes': { ko: '탐사 탐침', tier: 'minor', text: '궤도에서 ARC 탐침이 떨어진다. Motion Core와 회로 부품을 얻기 좋다.' },
  'Uncovered Caches': { ko: '드러난 은닉처', tier: 'minor', text: '날씨로 묻혀 있던 상자가 드러난다. 오래 두면 폭발하므로 빨리 연다.' },
  'Husk Graveyard': { ko: '허스크 무덤', tier: 'minor', text: '부서진 ARC 잔해가 흩어져 있다. 뜯을 때 소리가 커서 주의.' },
  'Launch Tower Loot': { ko: '발사탑 보급', tier: 'minor', text: '스페이스포트 발사탑. 연료 전지로 발전기를 켜고 꼭대기 무기 상자를 연다.' },
  'Lush Blooms': { ko: '꽃 피는 날', tier: 'minor', text: '식물이 무성해져 음식 바구니(레몬, 올리브, 아가베, 버섯)가 많이 생긴다.' },
  'Bird City': { ko: '버드 시티', tier: 'minor', text: 'ARC가 한꺼번에 몰려오는 고밀도 출현 이벤트. 포위되지 않게 조심.' },
  Redirection: { ko: '경로 변경', tier: 'minor', text: '펜돌라 패스. 트랜스미터로 하베스터 화물을 끌어온다. ARC와 다른 레이더도 몰려온다.' },
  Beachcombing: { ko: '해변 수색', tier: 'minor', text: '리븐 타이즈 모래 속 물건을 Dockmaster\'s Detector로 찾는다.' },
};

const REGIONS = [
  ['east-asia', '아시아'], ['north-america', '북미'], ['europe', '유럽'], ['oceania', '오세아니아'], ['brazil', '남미'],
];

// ---------- 공용 ----------

// 화면 사이를 오가도 다시 받지 않도록 모듈 단위로 보관
const memo = new Map();

const useArcApi = (path, refreshMs) => {
  const [state, setState] = useState(() => memo.get(path) || { data: null, error: null });
  useEffect(() => {
    let alive = true;
    const load = () => fetch(`/api/arc/${path}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((data) => { const s = { data, error: null }; memo.set(path, s); if (alive) setState(s); })
      .catch(() => { if (alive) setState((s) => ({ ...s, error: '정보를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.' })); });
    const cached = memo.get(path);
    if (!cached?.data || (refreshMs && Date.now() - cached.data.fetchedAt > refreshMs)) load();
    const id = refreshMs ? setInterval(load, refreshMs) : null;
    return () => { alive = false; if (id) clearInterval(id); };
  }, [path, refreshMs]);
  return state;
};

const useNow = (ms = 1000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
};

const useStored = (key, init) => {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : init; } catch { return init; }
  });
  const set = (next) => {
    setV((prev) => {
      const val = typeof next === 'function' ? next(prev) : next;
      try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* 저장 불가 환경은 무시 */ }
      return val;
    });
  };
  return [v, set];
};

const pad = (n) => String(n).padStart(2, '0');
const fmtLeft = (ms) => {
  if (ms <= 0) return '0초';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h >= 24) return `${Math.floor(h / 24)}일 ${h % 24}시간`;
  if (h > 0) return `${h}시간 ${pad(m)}분`;
  return `${m}분 ${pad(sec)}초`;
};
const fmtTime = (t) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmtDay = (t, now) => {
  const a = new Date(t), b = new Date(now);
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(a) - day(b)) / 86400000);
  return diff === 0 ? '오늘' : diff === 1 ? '내일' : diff === -1 ? '어제' : `${a.getMonth() + 1}/${a.getDate()}`;
};
const ago = (t, now) => {
  const m = Math.max(0, Math.round((now - t) / 60000));
  return m < 1 ? '방금' : m < 60 ? `${m}분 전` : `${Math.round(m / 60)}시간 전`;
};
const num = (n) => (n || 0).toLocaleString('en-US');

const RAR_KO = { ...RARITY_KO, Amplified: '증폭' };
const Rar = ({ r }) => (r ? <span className={`ar-rar r-${r.toLowerCase()}`}>{RAR_KO[r] || r}</span> : <span className="ar-dim">-</span>);
const Icon = ({ src, alt, size = 40 }) => (src
  ? <img className="ar-ico" src={src} alt={alt} width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
  : <span className="ar-ico ar-ico-empty" style={{ width: size, height: size }} aria-hidden="true" />);

export const LiveFoot = ({ fetchedAt, extra }) => {
  const now = useNow(30000);
  return (
    <footer className="ar-foot">
      <span className="ar-live-dot"><span className="tn-led" aria-hidden="true" /> 실시간 데이터</span>
      {fetchedAt && <span>갱신 {ago(fetchedAt, now)}</span>}
      <span>데이터 출처: <a href={LIVE_SOURCE} target="_blank" rel="noopener noreferrer">MetaForge (metaforge.app/arc-raiders)</a></span>
      <span>MetaForge 팀과 커뮤니티가 모은 비공식 정보이며 Embark Studios가 제공한 것이 아닙니다.</span>
      {extra}
    </footer>
  );
};

const Status = ({ state }) => {
  if (state.error && !state.data) return <p className="ar-empty ar-err" role="alert">{state.error}</p>;
  if (!state.data) return <p className="ar-empty" aria-busy="true">불러오는 중…</p>;
  return null;
};

// ---------- 이벤트 타이머 ----------

const evInfo = (name) => EVENT_INFO[name] || { ko: '', tier: 'minor', text: '' };

const useEvents = (region) => useArcApi(`events?region=${region}`, 5 * 60 * 1000);

const EventChip = ({ e, now, upcoming }) => (
  <li className={`ar-evchip${upcoming ? ' up' : ' on'}`}>
    <Icon src={e.icon} alt="" size={34} />
    <div>
      <strong>{e.name}</strong>
      <span>{MAP_KO[e.map] || e.map}</span>
      <em>{upcoming ? `${fmtLeft(e.start - now)} 후 시작` : `${fmtLeft(e.end - now)} 남음`}</em>
    </div>
  </li>
);

// 개요 화면 맨 위에 붙는 "지금 진행 중" 띠
export const NowStrip = () => {
  const [region] = useStored('arc.region', 'east-asia');
  const state = useEvents(region);
  const now = useNow();
  const evs = state.data?.events || [];
  const active = evs.filter((e) => e.start <= now && e.end > now);
  const trials = useArcApi('trials', 10 * 60 * 1000).data;
  if (!state.data) return null;
  return (
    <section className="ar-sec ar-now">
      <div className="ar-now-head">
        <h2><span className="tn-led" aria-hidden="true" /> 지금 진행 중인 맵 조건</h2>
        <Link to={`${BASE}/live`}>전체 일정 보기 →</Link>
      </div>
      {active.length ? <ul className="ar-evchips">{active.map((e) => <EventChip key={e.name + e.map} e={e} now={now} />)}</ul>
        : <p className="ar-dim">지금 진행 중인 조건이 없습니다.</p>}
      {trials && (
        <p className="ar-now-trials">
          이번 주 과제 <b>{trials.trials.filter((t) => t.active).length}개</b> · 남은 시간 <b>{fmtLeft(trials.activeEnd - now)}</b>
          <Link to={`${BASE}/trials`}>과제 보기 →</Link>
        </p>
      )}
      <LiveFoot fetchedAt={state.data.fetchedAt} />
    </section>
  );
};

export const LiveEvents = () => {
  const [region, setRegion] = useStored('arc.region', 'east-asia');
  const [map, setMap] = useState('');
  const [view, setView] = useState('event');
  const [fav, setFav] = useStored('arc.favEvents', []);
  const state = useEvents(region);
  const now = useNow();
  const evs = useMemo(() => (state.data?.events || []).filter((e) => e.end > now - 60000), [state.data, now]);
  const shown = evs.filter((e) => !map || e.map === map);
  const active = shown.filter((e) => e.start <= now && e.end > now);
  const upcoming = useMemo(() => {
    // 맵마다 다음 것 하나씩
    const seen = new Set();
    return shown.filter((e) => e.start > now).sort((a, b) => a.start - b.start).filter((e) => (seen.has(e.map) ? false : seen.add(e.map))).slice(0, 8);
  }, [shown, now]);

  const groups = useMemo(() => {
    const key = view === 'event' ? 'name' : 'map';
    const m = new Map();
    for (const e of shown) { if (!m.has(e[key])) m.set(e[key], []); m.get(e[key]).push(e); }
    const list = [...m.entries()].map(([k, list]) => ({ k, list: list.sort((a, b) => a.start - b.start) }));
    const rank = (g) => {
      const cur = g.list.find((e) => e.start <= now && e.end > now);
      const favd = view === 'event' && fav.includes(g.k) ? -1e15 : 0;
      return favd + (cur ? cur.end - 1e13 : g.list[0].start);
    };
    return view === 'map'
      ? list.sort((a, b) => MAP_ORDER.indexOf(a.k) - MAP_ORDER.indexOf(b.k))
      : list.sort((a, b) => rank(a) - rank(b));
  }, [shown, view, fav, now]);

  const toggleFav = (name) => setFav((f) => (f.includes(name) ? f.filter((x) => x !== name) : [...f, name]));
  const maps = [...new Set(evs.map((e) => e.map))].sort((a, b) => MAP_ORDER.indexOf(a) - MAP_ORDER.indexOf(b));

  return (
    <>
      <section className="ar-sec">
        <div className="ar-live-bar">
          <label>서버
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {REGIONS.map(([id, ko]) => <option key={id} value={id}>{ko}</option>)}
            </select>
          </label>
          <span className="ar-dim">시간은 이 기기 시간대 기준 · 1초마다 갱신</span>
        </div>
        <Status state={state} />
        {state.data && (
          <div className="ar-now-grid">
            <div>
              <h2><span className="tn-led" aria-hidden="true" /> 진행 중 <small>{active.length}</small></h2>
              {active.length ? <ul className="ar-evchips">{active.map((e) => <EventChip key={e.name + e.map + e.start} e={e} now={now} />)}</ul>
                : <p className="ar-dim">진행 중인 조건이 없습니다.</p>}
            </div>
            <div>
              <h2><span className="tn-led amber" aria-hidden="true" /> 맵별 다음 조건</h2>
              <ul className="ar-evchips">{upcoming.map((e) => <EventChip key={e.name + e.map + e.start} e={e} now={now} upcoming />)}</ul>
            </div>
          </div>
        )}
      </section>

      {state.data && (
        <section className="ar-sec">
          <div className="ar-live-bar">
            <div className="ar-seg" role="group" aria-label="보기 방식">
              <button type="button" className={view === 'event' ? 'on' : ''} onClick={() => setView('event')}>조건별</button>
              <button type="button" className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}>맵별</button>
            </div>
            <select value={map} onChange={(e) => setMap(e.target.value)} aria-label="맵">
              <option value="">맵: 전체</option>
              {maps.map((m) => <option key={m} value={m}>{MAP_KO[m] || m}</option>)}
            </select>
          </div>
          <div className="ar-evgrid">
            {groups.map((g) => {
              const cur = g.list.find((e) => e.start <= now && e.end > now);
              const next = g.list.filter((e) => e.start > now);
              const info = view === 'event' ? evInfo(g.k) : null;
              return (
                <article key={g.k} className={`ar-evcard${cur ? ' live' : ''}`}>
                  <header>
                    {view === 'event' && <Icon src={g.list[0].icon} alt="" size={38} />}
                    <div>
                      <h3>{view === 'event' ? g.k : (MAP_KO[g.k] || g.k)}</h3>
                      <span className="ar-sub">{view === 'event' ? [info.ko, info.tier === 'major' ? '주요 조건' : '소규모 이벤트'].filter(Boolean).join(' · ') : g.k}</span>
                    </div>
                    {cur ? <span className="ar-badge on">진행 중</span> : <span className="ar-badge">예정</span>}
                    {view === 'event' && (
                      <button type="button" className={`ar-star${fav.includes(g.k) ? ' on' : ''}`} onClick={() => toggleFav(g.k)}
                        aria-pressed={fav.includes(g.k)} aria-label={`${g.k} 즐겨찾기`} title="즐겨찾기(맨 위에 고정)">★</button>
                    )}
                  </header>
                  {info?.text && <p className="ar-evdesc">{info.text}</p>}
                  {cur ? g.list.filter((e) => e.start <= now && e.end > now).map((c) => (
                    <div key={c.map + c.name} className="ar-evnow on">
                      <span>{view === 'event' ? (MAP_KO[c.map] || c.map) : c.name}<small>{fmtTime(c.start)}–{fmtTime(c.end)}</small></span>
                      <b>{fmtLeft(c.end - now)}<small>남음</small></b>
                    </div>
                  )) : next[0] && (
                    <div className="ar-evnow">
                      <span>{view === 'event' ? (MAP_KO[next[0].map] || next[0].map) : next[0].name}<small>{fmtDay(next[0].start, now)} {fmtTime(next[0].start)}–{fmtTime(next[0].end)}</small></span>
                      <b>{fmtLeft(next[0].start - now)}<small>후 시작</small></b>
                    </div>
                  )}
                  <ol className="ar-evlist">
                    {next.slice(cur ? 0 : 1, (cur ? 0 : 1) + 5).map((e) => (
                      <li key={e.start + e.map + e.name} title={`${fmtLeft(e.start - now)} 후 시작`}>
                        <span>{fmtDay(e.start, now)} {fmtTime(e.start)}–{fmtTime(e.end)}</span>
                        <span>{view === 'event' ? (MAP_KO[e.map] || e.map) : e.name}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              );
            })}
          </div>
          <p className="ar-hint">맵마다 조건이 따로 돌아가고, 서버 지역마다 시각이 다릅니다. 고른 서버와 즐겨찾기는 이 브라우저에 저장됩니다.</p>
          <LiveFoot fetchedAt={state.data.fetchedAt} />
        </section>
      )}
    </>
  );
};

// ---------- 상인 재고 ----------

export const LiveTraders = () => {
  const state = useArcApi('traders', 10 * 60 * 1000);
  const [who, setWho] = useState('');
  const [q, setQ] = useState('');
  const traders = state.data?.traders || [];
  const cur = traders.find((t) => t.name === who) || traders[0];
  const items = (cur?.items || []).filter((i) => !q || i.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <section className="ar-sec">
      <h2>상인별 현재 판매 목록</h2>
      <Status state={state} />
      {cur && (
        <>
          <div className="ar-seg" role="tablist" aria-label="상인">
            {traders.map((t) => (
              <button key={t.name} type="button" role="tab" aria-selected={t === cur} className={t === cur ? 'on' : ''} onClick={() => setWho(t.name)}>
                {t.name} <small>{t.items.length}</small>
              </button>
            ))}
          </div>
          <div className="ar-filters one">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="물건 이름 검색" aria-label="물건 이름 검색" />
          </div>
          <ul className="ar-shop">
            {items.map((i) => (
              <li key={i.id} className={`b-${(i.rarity || 'common').toLowerCase()}`}>
                <Icon src={i.icon} alt="" size={52} />
                <div>
                  <strong>{i.name}</strong>
                  <span className="ar-sub">{i.type} · <Rar r={i.rarity} /></span>
                  {i.desc && <p>{i.desc}</p>}
                </div>
                <dl>
                  <div><dt>구매가</dt><dd>{num(i.price)}</dd></div>
                  <div><dt>판매가</dt><dd>{num(i.value)}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
          {items.length === 0 && <p className="ar-empty">찾는 물건이 없습니다.</p>}
          <p className="ar-hint">구매가는 상인에게 살 때, 판매가는 상인에게 팔 때 받는 코인입니다. 상인 재고는 게임 안에서 주기적으로 바뀝니다.</p>
        </>
      )}
      {state.data && <LiveFoot fetchedAt={state.data.fetchedAt} />}
    </section>
  );
};

// ---------- 아이템 DB ----------

const PAGE = 60;
const SORTS = {
  name: ['이름순', (a, b) => a.name.localeCompare(b.name)],
  value: ['판매가 높은 순', (a, b) => b.value - a.value],
  vpw: ['무게당 가치 높은 순', (a, b) => vpw(b) - vpw(a)],
};
const vpw = (i) => (i.weight > 0 ? i.value / i.weight : 0);
const RAR_ORDER = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Amplified'];
// 증폭 무기의 모드 조합(이름에 괄호)은 수백 개라 기본으로 숨긴다
const isVariant = (i) => i.name.startsWith('Amplified ') && i.name.includes('(');

export const LiveItems = () => {
  const state = useArcApi('items', 0);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [rar, setRar] = useState('');
  const [sort, setSort] = useState('value');
  const [variants, setVariants] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [open, setOpen] = useState(null);
  const [onlyNeed, setOnlyNeed] = useState(false);
  const { map: needMap } = useStillNeeded();
  const all = useMemo(() => state.data?.items || [], [state.data]);
  const types = useMemo(() => [...new Set(all.map((i) => i.type).filter(Boolean))].sort(), [all]);
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return all.filter((i) => (variants || !isVariant(i)) && (!type || i.type === type) && (!rar || i.rarity === rar) && (!s || i.name.toLowerCase().includes(s)) && (!onlyNeed || needMap.has(i.id)))
      .sort(SORTS[sort][1]);
  }, [all, q, type, rar, sort, variants, onlyNeed, needMap]);
  useEffect(() => setLimit(PAGE), [q, type, rar, sort, variants, onlyNeed]);

  return (
    <section className="ar-sec">
      <h2>아이템 데이터베이스</h2>
      <Status state={state} />
      {state.data && (
        <>
          <div className="ar-filters four">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="아이템 이름(영문) 검색" aria-label="아이템 검색" />
            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="분류">
              <option value="">분류: 전체</option>
              {types.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <select value={rar} onChange={(e) => setRar(e.target.value)} aria-label="희귀도">
              <option value="">희귀도: 전체</option>
              {RAR_ORDER.map((x) => <option key={x} value={x}>{RAR_KO[x]}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="정렬">
              {Object.entries(SORTS).map(([k, [ko]]) => <option key={k} value={k}>{ko}</option>)}
            </select>
          </div>
          <div className="ar-count ar-countbar">
            <span>{num(rows.length)}개 / 전체 {num(all.length)}개 (외형 아이템 제외)</span>
            <span className="ar-countbar-opts">
              <label><input type="checkbox" checked={onlyNeed} onChange={(e) => setOnlyNeed(e.target.checked)} /> 아직 필요한 것만</label>
              <label><input type="checkbox" checked={variants} onChange={(e) => setVariants(e.target.checked)} /> 증폭 무기 모드 조합도 보기</label>
            </span>
          </div>
          <div className="ar-table-wrap">
            <table className="ar-table ar-stack ar-items">
              <thead><tr><th>이름</th><th>분류</th><th>희귀도</th><th className="ar-num">판매가</th><th className="ar-num">무게</th><th className="ar-num">무게당 가치</th><th className="ar-num">묶음</th></tr></thead>
              <tbody>
                {rows.slice(0, limit).map((i) => (
                  <React.Fragment key={i.id}>
                    <tr className={open === i.id ? 'open' : ''}>
                      <td data-label="이름">
                        <button type="button" className="ar-itemname" onClick={() => setOpen(open === i.id ? null : i.id)} aria-expanded={open === i.id}>
                          <Icon src={i.icon} alt="" size={32} /> <strong>{i.name}</strong>
                          {needMap.has(i.id) && <span className="ar-keep" title="남은 퀘스트나 작업대 업그레이드에 필요">보관 ×{needMap.get(i.id).qty}</span>}
                        </button>
                      </td>
                      <td data-label="분류">{i.type || '-'}</td>
                      <td data-label="희귀도"><Rar r={i.rarity} /></td>
                      <td data-label="판매가" className="ar-num">{i.value ? num(i.value) : '-'}</td>
                      <td data-label="무게" className="ar-num">{i.weight ? i.weight : '-'}</td>
                      <td data-label="무게당 가치" className="ar-num">{vpw(i) ? num(Math.round(vpw(i))) : '-'}</td>
                      <td data-label="묶음" className="ar-num">{i.stack || '-'}</td>
                    </tr>
                    {open === i.id && (
                      <tr className="ar-itemmore"><td colSpan={7}>
                        {i.desc && <p>{i.desc}</p>}
                        {i.area && <p><b>주로 나오는 곳</b> {i.area}</p>}
                        {i.workbench && <p><b>제작</b> {i.workbench}</p>}
                        {needMap.has(i.id) && <p><b>아직 필요</b> {needMap.get(i.id).uses.map((u) => `${u.label} ×${u.qty}`).join(' · ')}</p>}
                        <p><a href={`${LIVE_SOURCE}/database/item/${i.id}`} target="_blank" rel="noopener noreferrer">MetaForge에서 자세히 보기 ↗</a></p>
                      </td></tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="ar-empty">찾는 아이템이 없습니다.</p>}
          </div>
          {rows.length > limit && (
            <button type="button" className="ar-moreBtn" onClick={() => setLimit((l) => l + PAGE)}>더 보기 ({num(rows.length - limit)}개 남음)</button>
          )}
          <p className="ar-hint">무게당 가치는 판매가를 무게로 나눈 값입니다. 가방 칸이 부족할 때 무엇을 남길지 고르는 데 씁니다. 이름을 누르면 설명이 열립니다. &lsquo;보관&rsquo; 표시는 끝내지 않은 퀘스트나 아직 안 올린 작업대 단계에 들어가는 아이템입니다(퀘스트 체크·작업대 단계 기준).</p>
          <LiveFoot fetchedAt={state.data.fetchedAt} />
        </>
      )}
    </section>
  );
};

// ---------- 공용: 아이템 이름·그림 찾기, 남은 퀘스트·작업대 재료 ----------

const prettyId = (id) => id.split('-').map((w) => (w === 'arc' ? 'ARC' : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');

const useItemIndex = () => {
  const state = useArcApi('items', 0);
  return useMemo(() => new Map((state.data?.items || []).map((i) => [i.id, i])), [state.data]);
};

// 작업대 현재 단계 (작업대 계산기·필요 아이템·아이템 DB 화면이 같이 씀)
const useBenchLevels = () => useStored('arc.benchLv', {});

/** 끝내지 않은 퀘스트와 아직 안 올린 작업대 단계에 들어가는 재료 합계: id → { qty, uses[] } */
const useStillNeeded = ({ withQuests = true, withBenches = true, trader = '' } = {}) => {
  const qs = useArcApi('quests', 0);
  const hs = useArcApi('hideout', 0);
  const [done] = useStored('arc.doneQuests', []);
  const [lv] = useBenchLevels();
  const map = useMemo(() => {
    const m = new Map();
    const add = (id, qty, use, extra) => {
      if (!m.has(id)) m.set(id, { id, qty: 0, uses: [], ...extra });
      const x = m.get(id); x.qty += qty; x.uses.push(use);
    };
    if (withQuests) {
      const doneSet = new Set(done);
      for (const q of qs.data?.quests || []) {
        if (doneSet.has(q.id) || (trader && q.trader !== trader)) continue;
        for (const r of q.required) add(r.id, r.qty, { kind: 'quest', label: q.name, qty: r.qty }, { name: r.name, icon: r.icon, rarity: r.rarity });
      }
    }
    if (withBenches && !trader) {
      for (const b of hs.data?.benches || []) {
        for (const l of b.levels) {
          if (l.level <= (lv[b.id] || 0)) continue;
          for (const r of l.items) add(r.id, r.qty, { kind: 'bench', label: `${b.name} ${l.level}단계`, qty: r.qty });
        }
      }
    }
    return m;
  }, [qs.data, hs.data, done, lv, withQuests, withBenches, trader]);
  return { map, quests: qs, hideout: hs };
};

// ---------- 필요 아이템 (퀘스트 + 작업대) ----------

export const NeededItems = () => {
  const state = useArcApi('quests', 0);
  const idx = useItemIndex();
  const [done, setDone] = useStored('arc.doneQuests', []);
  const [withBenches, setWithBenches] = useStored('arc.needBench', true);
  const [trader, setTrader] = useState('');
  const [tab, setTab] = useState('items');
  const [openQ, setOpenQ] = useState(null);
  const { map, hideout } = useStillNeeded({ withBenches, trader });
  const quests = useMemo(() => (state.data?.quests || []).slice().sort((a, b) => a.trader.localeCompare(b.trader) || a.order - b.order), [state.data]);
  const traders = useMemo(() => [...new Set(quests.map((q) => q.trader).filter(Boolean))].sort(), [quests]);
  const doneSet = new Set(done);
  const need = useMemo(() => [...map.values()].map((n) => {
    const it = idx.get(n.id);
    return { ...n, name: n.name || it?.name || prettyId(n.id), icon: n.icon || it?.icon, rarity: n.rarity || it?.rarity };
  }).sort((a, b) => b.uses.length - a.uses.length || b.qty - a.qty), [map, idx]);
  const toggle = (id) => setDone((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));

  return (
    <section className="ar-sec">
      <h2>아직 필요한 아이템</h2>
      <Status state={state} />
      {state.data && (
        <>
          <p className="ar-hint" style={{ marginTop: 0 }}>끝낸 퀘스트를 체크하면 남은 퀘스트에 내야 하는 아이템만 합산합니다. <Link to={`${BASE}/upgrade`}>작업대 계산기</Link>에서 고른 단계 이후의 업그레이드 재료도 더할 수 있습니다. 체크 상태는 이 브라우저에 저장됩니다.</p>
          <div className="ar-live-bar">
            <div className="ar-seg" role="group" aria-label="보기">
              <button type="button" className={tab === 'items' ? 'on' : ''} onClick={() => setTab('items')}>필요 아이템 <small>{need.length}</small></button>
              <button type="button" className={tab === 'quests' ? 'on' : ''} onClick={() => setTab('quests')}>퀘스트 체크 <small>{done.length}/{quests.length}</small></button>
            </div>
            <select value={trader} onChange={(e) => setTrader(e.target.value)} aria-label="상인">
              <option value="">상인: 전체</option>
              {traders.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            {tab === 'items' && !trader && (
              <label className="ar-inline-check"><input type="checkbox" checked={withBenches} onChange={(e) => setWithBenches(e.target.checked)} disabled={!hideout.data} /> 작업대 재료 포함</label>
            )}
          </div>
          {tab === 'items' ? (
            <>
              <ul className="ar-need">
                {need.map((n) => (
                  <li key={n.id}>
                    <Icon src={n.icon} alt="" size={44} />
                    <div>
                      <strong>{n.name}</strong> <Rar r={n.rarity} />
                      <small>{n.uses.map((u) => `${u.kind === 'bench' ? '🔧 ' : ''}${u.label} ×${u.qty}`).join(' · ')}</small>
                    </div>
                    <b>×{n.qty}</b>
                  </li>
                ))}
              </ul>
              {need.length === 0 && <p className="ar-empty">남은 퀘스트·작업대에 낼 아이템이 없습니다.</p>}
            </>
          ) : (
            <>
              <ul className="ar-qcheck">
                {quests.filter((q) => !trader || q.trader === trader).map((q) => (
                  <li key={q.id} className={doneSet.has(q.id) ? 'done' : ''}>
                    <label>
                      <input type="checkbox" checked={doneSet.has(q.id)} onChange={() => toggle(q.id)} />
                      <span><strong>{q.name}</strong><small>{q.trader}{q.required.length ? ` · 제출 ${q.required.map((r) => `${r.name} ×${r.qty}`).join(', ')}` : ''}</small></span>
                    </label>
                    {(q.objectives.length > 0 || q.rewards.length > 0) && (
                      <button type="button" className="ar-linkbtn" aria-expanded={openQ === q.id} onClick={() => setOpenQ(openQ === q.id ? null : q.id)}>{openQ === q.id ? '접기' : '목표·보상'}</button>
                    )}
                    {openQ === q.id && (
                      <div className="ar-qmore">
                        {q.objectives.length > 0 && <><b>목표</b><ol>{q.objectives.map((o, i) => <li key={i}>{typeof o === 'string' ? o : o.text || o.description || JSON.stringify(o)}</li>)}</ol></>}
                        {q.rewards.length > 0 && <><b>보상</b><p>{q.rewards.map((r) => `${r.name} ×${r.qty}`).join(', ')}{q.xp ? ` · ${num(q.xp)} XP` : ''}</p></>}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {done.length > 0 && <button type="button" className="ar-moreBtn" onClick={() => setDone([])}>체크 모두 지우기</button>}
            </>
          )}
          <LiveFoot fetchedAt={state.data.fetchedAt} />
        </>
      )}
    </section>
  );
};

// ---------- 주간 과제 ----------

// 자주 나오는 과제 이름을 한국어로 (모르는 것은 영어 그대로)
const TRIAL_KO = [
  [/^Damage (any )?ARC enemies$/i, 'ARC에게 피해 주기'],
  [/^Damage ARC enemies using (?:a |the )?(.+)$/i, (m) => `${m[1]}(으)로 ARC에게 피해 주기`],
  [/^Damage ARC enemies (?:in|on|inside) (?:the )?(.+)$/i, (m) => `${MAP_KO[m[1]] || m[1]}에서 ARC에게 피해 주기`],
  [/^Deal melee damage to ARC enemies$/i, 'ARC에게 근접 공격으로 피해 주기'],
  [/^Damage (.+)$/i, (m) => `${m[1].replace(/ or /g, '·')}에게 피해 주기`],
  [/^Destroy (.+)$/i, (m) => `${m[1]} 파괴하기`],
  [/^Search destroyed ARC$/i, '부서진 ARC 뒤지기'],
  [/^Search (.+?)(?: on (.+))?$/i, (m) => `${m[2] ? `${MAP_KO[m[2]] || m[2]}에서 ` : ''}${m[1]} 뒤지기`],
  [/^Open Containers$/i, '보관함 열기'],
  [/^(?:Loot|Pick up) (.+)$/i, (m) => `${m[1]} 줍기`],
  [/^Extract (.+)$/i, (m) => `${m[1]} 들고 탈출하기`],
  [/^Revive (.+)$/i, (m) => `${m[1]} 살리기`],
  [/^Knock down (.+)$/i, (m) => `${m[1]} 쓰러뜨리기`],
];
const trialKo = (name) => {
  for (const [re, to] of TRIAL_KO) {
    const m = name.match(re);
    if (m) return typeof to === 'function' ? to(m) : to;
  }
  return '';
};

const TrialCard = ({ t, done, onToggle }) => {
  const ko = trialKo(t.name);
  return (
    <li className={`ar-trial${done ? ' done' : ''}`}>
      {t.image ? <img src={t.image} alt="" width={56} height={56} loading="lazy" referrerPolicy="no-referrer" /> : <span className="ar-ico ar-ico-empty" style={{ width: 56, height: 56 }} aria-hidden="true" />}
      <div>
        <strong>{ko || t.name}</strong>
        {ko && <span className="ar-sub">{t.name}</span>}
        {t.maps.length > 0 && <span className="ar-sub">맵: {t.maps.map((m) => MAP_KO[m] || m).join(', ')}</span>}
        {t.guide && <a href={t.guide} target="_blank" rel="noopener noreferrer">공략 ↗</a>}
      </div>
      {onToggle && (
        <label className="ar-trial-check">
          <input type="checkbox" checked={done} onChange={onToggle} /> 완료
        </label>
      )}
    </li>
  );
};

export const LiveTrials = () => {
  const state = useArcApi('trials', 10 * 60 * 1000);
  const now = useNow();
  const [doneAll, setDoneAll] = useStored('arc.doneTrials', {});
  const d = state.data;
  const active = (d?.trials || []).filter((t) => t.active).sort((a, b) => a.order - b.order);
  const next = (d?.trials || []).filter((t) => !t.active).sort((a, b) => a.order - b.order);
  const week = String(d?.activeEnd || '');
  const done = doneAll[week] || [];
  // 지난 주 기록은 버리고 이번 주 것만 남긴다
  const toggle = (id) => setDoneAll((all) => {
    const cur = all[week] || [];
    return { [week]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
  });
  return (
    <section className="ar-sec">
      <h2>이번 주 과제 (Weekly Trials)</h2>
      <Status state={state} />
      {d && (
        <>
          <div className="ar-trial-head">
            <div><span className="ar-dim">이번 주 남은 시간</span><b>{fmtLeft(d.activeEnd - now)}</b><small>{fmtDay(d.activeEnd, now)} {fmtTime(d.activeEnd)}에 끝남</small></div>
            <div><span className="ar-dim">완료</span><b>{done.filter((id) => active.some((t) => t.id === id)).length} / {active.length}</b><small>체크는 이 브라우저에 저장</small></div>
            <div><span className="ar-dim">다음 주 과제 시작</span><b>{d.nextStart > now ? fmtLeft(d.nextStart - now) : '시작됨'}</b><small>{fmtDay(d.nextStart, now)} {fmtTime(d.nextStart)}</small></div>
          </div>
          {active.length ? (
            <ul className="ar-trials">{active.map((t) => <TrialCard key={t.id} t={t} done={done.includes(t.id)} onToggle={() => toggle(t.id)} />)}</ul>
          ) : <p className="ar-empty">지금 진행 중인 과제가 없습니다.</p>}
          {next.length > 0 && (
            <>
              <h3 className="ar-h3">다음 주 예정 <small className="ar-dim">{fmtDay(d.nextStart, now)} {fmtTime(d.nextStart)}부터</small></h3>
              <ul className="ar-trials next">{next.map((t) => <TrialCard key={t.id} t={t} />)}</ul>
            </>
          )}
          <p className="ar-hint">주간 과제는 매주 바뀝니다. 완료 체크는 주가 바뀌면 자동으로 지워집니다.</p>
          <LiveFoot fetchedAt={d.fetchedAt} />
        </>
      )}
    </section>
  );
};

// ---------- 작업대 업그레이드 계산기 ----------

const BENCH_KO = {
  scrappy: '수탉 Scrappy', 'weapon-bench': '무기 작업대', 'equipment-bench': '장비 작업대', 'med-station': '의무실',
  'explosives-bench': '폭발물 작업대', 'utility-bench': '도구 작업대', refiner: '정제기', 'research-station': '연구소', outpost: '전초기지',
};
const UNLOCK_KO = { 'rounds-played': '판 참여', raids: '레이드' };

const ItemChip = ({ id, qty, idx, owned }) => {
  const it = idx.get(id);
  return (
    <li className={owned ? 'ok' : ''} title={it?.desc || ''}>
      <Icon src={it?.icon} alt="" size={28} />
      <span>{it?.name || prettyId(id)}</span>
      <b>×{qty}</b>
    </li>
  );
};

export const UpgradePlanner = () => {
  const hs = useArcApi('hideout', 0);
  const idx = useItemIndex();
  const [lv, setLv] = useBenchLevels();
  const benches = useMemo(() => hs.data?.benches || [], [hs.data]);
  const total = useMemo(() => {
    const m = new Map();
    for (const b of benches) for (const l of b.levels) {
      if (l.level <= (lv[b.id] || 0)) continue;
      for (const r of l.items) m.set(r.id, (m.get(r.id) || 0) + r.qty);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [benches, lv]);
  const setLevel = (id, v) => setLv((cur) => ({ ...cur, [id]: v }));
  const maxed = benches.filter((b) => (lv[b.id] || 0) >= b.maxLevel).length;
  return (
    <section className="ar-sec">
      <h2>작업대 업그레이드 계산기</h2>
      <Status state={hs} />
      {hs.data && (
        <>
          <p className="ar-hint" style={{ marginTop: 0 }}>작업대마다 지금 단계를 고르면 끝까지 올리는 데 남은 재료를 모두 더해 보여 줍니다. 고른 단계는 이 브라우저에 저장되고 &lsquo;필요 아이템&rsquo;과 &lsquo;아이템 DB&rsquo; 화면에도 반영됩니다.</p>
          <div className="ar-count ar-countbar">
            <span>최고 단계 {maxed} / {benches.length}개 · 남은 재료 {total.length}종</span>
            {Object.keys(lv).length > 0 && <button type="button" className="ar-linkbtn" onClick={() => setLv({})}>단계 모두 지우기</button>}
          </div>
          {total.length > 0 && (
            <div className="ar-card-lite">
              <h3 className="ar-h3">남은 재료 합계</h3>
              <ul className="ar-chips">{total.map(([id, qty]) => <ItemChip key={id} id={id} qty={qty} idx={idx} />)}</ul>
            </div>
          )}
          <div className="ar-benches">
            {benches.map((b) => {
              const cur = lv[b.id] || 0;
              return (
                <article key={b.id} className={`ar-bench${cur >= b.maxLevel ? ' max' : ''}`}>
                  <header>
                    <div><h3>{b.name}</h3><span className="ar-sub">{BENCH_KO[b.id] || ''}</span></div>
                    <label>지금
                      <select value={cur} onChange={(e) => setLevel(b.id, Number(e.target.value))} aria-label={`${b.name} 지금 단계`}>
                        {Array.from({ length: b.maxLevel + 1 }, (_, i) => <option key={i} value={i}>{`${i}단계`}{i === b.maxLevel ? ' (최고)' : ''}</option>)}
                      </select>
                    </label>
                  </header>
                  <ol>
                    {b.levels.map((l) => (
                      <li key={l.level} className={l.level <= cur ? 'done' : l.level === cur + 1 ? 'next' : ''}>
                        <div className="ar-bench-lv">{l.level}단계{l.level <= cur ? ' ✓' : ''}</div>
                        <div>
                          {l.unlock.length > 0 && <small className="ar-dim">조건: {l.unlock.map((u) => `${UNLOCK_KO[u.id] || prettyId(u.id)} ${u.qty}회`).join(', ')}</small>}
                          {l.items.length ? <ul className="ar-chips">{l.items.map((r) => <ItemChip key={r.id} id={r.id} qty={r.qty} idx={idx} owned={l.level <= cur} />)}</ul>
                            : <small className="ar-dim">재료 없음</small>}
                          {l.crafts.length > 0 && <small className="ar-crafts">해금: {l.crafts.map((c) => idx.get(c)?.name || prettyId(c)).join(', ')}</small>}
                        </div>
                      </li>
                    ))}
                  </ol>
                </article>
              );
            })}
          </div>
          <LiveFoot fetchedAt={hs.data.fetchedAt} />
        </>
      )}
    </section>
  );
};
