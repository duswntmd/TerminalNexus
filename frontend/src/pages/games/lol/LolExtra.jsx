// 롤 전적 검색의 부가 화면: 랭킹, 멀티서치, 아이템, 룬·주문
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PLATFORMS, POS, TIERS, choseong, img, loadRunes, loadSpells, plain } from './ddragon';
import { BASE, kdaRatio, lolGet, parseLobby, pct, summonerPath, useStatic } from './lolApi';
import { ChampIco, Ico, TierTag } from './lolUi';

const usePlatformPick = () => {
  const [p, setP] = useState(() => { try { return localStorage.getItem('lol.platform') || 'kr'; } catch { return 'kr'; } });
  const set = (v) => { setP(v); try { localStorage.setItem('lol.platform', v); } catch { /* 무시 */ } };
  return [p, set];
};
const PlatformSelect = ({ value, onChange }) => (
  <select className="lol-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label="서버">
    {PLATFORMS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
  </select>
);

// ---------- 랭킹 ----------

export const Ranking = () => {
  const [platform, setPlatform] = usePlatformPick();
  const [queue, setQueue] = useState('RANKED_SOLO_5x5');
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let alive = true;
    setData(null); setErr(null);
    lolGet(`ranking?platform=${platform}&queue=${queue}&page=${page}&size=20`)
      .then((d) => alive && setData(d)).catch((e) => alive && setErr(e.message));
    return () => { alive = false; };
  }, [platform, queue, page]);
  const pages = data ? Math.ceil(data.total / data.size) : 0;
  return (
    <section>
      <Helmet>
        <title>리그 오브 레전드 랭킹 - 챌린저·그랜드마스터 순위 | TerminalNexus</title>
        <meta name="description" content="리그 오브 레전드 솔로랭크·자유랭크 챌린저와 그랜드마스터 소환사 순위를 LP 순으로 확인합니다." />
      </Helmet>
      <h1 className="lol-h1">랭킹</h1>
      <div className="lol-filter row">
        <PlatformSelect value={platform} onChange={(v) => { setPlatform(v); setPage(0); }} />
        <div className="lol-seg" role="group" aria-label="큐">
          {[['RANKED_SOLO_5x5', '솔로랭크'], ['RANKED_FLEX_SR', '자유랭크']].map(([q, l]) => (
            <button key={q} type="button" className={queue === q ? 'on' : ''} onClick={() => { setQueue(q); setPage(0); }}>{l}</button>
          ))}
        </div>
      </div>
      {err && <div className="lol-card lol-error" role="alert"><strong>{err}</strong></div>}
      {!err && !data && <div className="lol-card lol-loading" aria-busy="true">순위를 불러오는 중…</div>}
      {data && (
        <div className="lol-card">
          <div className="lol-table-wrap">
            <table className="lol-table lol-ladder">
              <thead><tr><th>순위</th><th>소환사</th><th>티어</th><th className="num">LP</th><th>승률</th></tr></thead>
              <tbody>
                {data.entries.map((e) => {
                  const g = e.wins + e.losses;
                  return (
                    <tr key={e.puuid}>
                      <td className="num"><b>{e.rank}</b></td>
                      <td>{e.gameName ? <Link to={summonerPath(platform, e.gameName, e.tagLine)}>{e.gameName}<small>#{e.tagLine}</small></Link> : <span className="lol-dim">(이름 확인 중)</span>}{e.hotStreak && <em className="lol-hot"> 연승</em>}</td>
                      <td><span className={`lol-tier t-${e.tier.toLowerCase()}`}>{TIERS[e.tier]}</span></td>
                      <td className="num"><b>{e.lp.toLocaleString()}</b></td>
                      <td>
                        <div className="lol-wrbar"><i className="w" style={{ width: `${pct(e.wins, g)}%` }}>{e.wins}승</i><i className="l">{e.losses}패</i></div>
                        <small>{pct(e.wins, g)}%</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="lol-pager">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>← 이전</button>
            <span>{page + 1} / {pages} 쪽 · 전체 {data.total.toLocaleString()}명</span>
            <button type="button" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>다음 →</button>
          </div>
        </div>
      )}
      <p className="lol-note">챌린저와 그랜드마스터만 보여 줍니다. 순위는 30분마다 새로 받습니다.</p>
    </section>
  );
};

// ---------- 멀티서치 ----------

const MultiCard = ({ s, platform, who }) => {
  const [st, setSt] = useState({ loading: true });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const p = await lolGet(`summoner?platform=${platform}&name=${encodeURIComponent(who.name)}&tag=${encodeURIComponent(who.tag)}`);
        if (!alive) return;
        setSt({ p, loading: true });
        const ms = await lolGet(`matches?platform=${platform}&puuid=${encodeURIComponent(p.puuid)}&start=0&count=10&queue=420`);
        if (alive) setSt({ p, ms, loading: false });
      } catch (e) {
        if (alive) setSt((x) => ({ ...x, err: e.message, loading: false }));
      }
    })();
    return () => { alive = false; };
  }, [platform, who.name, who.tag]);
  const { p, ms, err, loading } = st;
  const games = useMemo(() => (p && ms ? ms.map((m) => m.participants.find((x) => x.puuid === p.puuid)).filter((x) => x && !x.remake) : []), [p, ms]);
  const solo = p?.ranks.find((r) => r.queue === 'RANKED_SOLO_5x5');
  const w = games.filter((g) => g.win).length;
  const sum = (k) => games.reduce((a, g) => a + g[k], 0);
  const champs = Object.values(games.reduce((m, g) => {
    const c = (m[g.championName] ||= { name: g.championName, n: 0, w: 0 });
    c.n++; c.w += g.win ? 1 : 0; return m;
  }, {})).sort((a, b) => b.n - a.n).slice(0, 3);
  const pos = Object.entries(games.reduce((m, g) => { if (g.position) m[g.position] = (m[g.position] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1])[0];
  return (
    <li className="lol-multi-card">
      <header>
        {p && s ? <Ico src={img.profile(s.ver, p.profileIconId)} size={40} round /> : <Ico size={40} />}
        <div>
          <Link to={summonerPath(platform, p?.gameName || who.name, p?.tagLine || who.tag)}><strong>{p?.gameName || who.name}</strong><small>#{p?.tagLine || who.tag}</small></Link>
          {p && <span className="lol-dim">레벨 {p.summonerLevel}{pos ? ` · 주 포지션 ${POS[pos[0]]}` : ''}</span>}
        </div>
      </header>
      {err && <p className="lol-error-text">{err}</p>}
      {p && <TierTag r={solo} />}
      {loading && <p className="lol-dim" aria-busy="true">불러오는 중…</p>}
      {ms && (games.length ? (
        <>
          <div className="lol-multi-wr">
            <span>최근 솔로랭크 {games.length}판</span>
            <b className={w / games.length >= 0.6 ? 'hi' : w / games.length < 0.4 ? 'lo' : ''}>{pct(w, games.length)}%</b>
            <span>{w}승 {games.length - w}패 · KDA {kdaRatio(sum('kills'), sum('deaths'), sum('assists'))}</span>
          </div>
          <ol className="lol-streak" aria-label="최근 결과 (왼쪽이 최근)">
            {games.map((g, i) => <li key={i} className={g.win ? 'w' : 'l'} title={`${g.championName} ${g.kills}/${g.deaths}/${g.assists}`}>{g.win ? '승' : '패'}</li>)}
          </ol>
          <ul className="lol-multi-champs">
            {champs.map((c) => <li key={c.name}><ChampIco s={s} name={c.name} size={28} round /><span>{c.n}판 {pct(c.w, c.n)}%</span></li>)}
          </ul>
        </>
      ) : <p className="lol-dim">최근 솔로랭크 기록이 없습니다.</p>)}
    </li>
  );
};

export const MultiSearch = () => {
  const [s] = useStatic();
  const [platform, setPlatform] = usePlatformPick();
  const [text, setText] = useState('');
  const [list, setList] = useState([]);
  const def = PLATFORMS.find((x) => x[0] === platform)?.[2] || 'KR1';
  const submit = (e) => { e.preventDefault(); setList(parseLobby(text, def)); };
  return (
    <section>
      <Helmet>
        <title>롤 멀티서치 - 로비 채팅 붙여넣고 팀원 전적 한 번에 | TerminalNexus</title>
        <meta name="description" content="롤 로비 채팅을 그대로 붙여 넣으면 팀원 5명의 솔로랭크 티어, 최근 승률, KDA, 많이 한 챔피언을 한 번에 보여 줍니다." />
      </Helmet>
      <h1 className="lol-h1">멀티서치</h1>
      <form className="lol-card lol-multi-form" onSubmit={submit}>
        <label htmlFor="lol-multi-text">로비 채팅을 그대로 붙여 넣거나, 이름#태그를 줄마다 또는 쉼표로 적어 주세요. (최대 5명)</label>
        <textarea id="lol-multi-text" rows={5} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false}
          placeholder={'Hide on bush #KR1님이 로비에 참가했습니다.\n소환사2#KR1님이 로비에 참가했습니다.\n소환사3#KR1, 소환사4#KR1'} />
        <div className="lol-multi-actions">
          <PlatformSelect value={platform} onChange={setPlatform} />
          <button type="submit" className="lol-btn">한 번에 검색</button>
        </div>
      </form>
      {list.length > 0 && (
        <ul className="lol-multi-list">
          {list.map((w) => <MultiCard key={`${platform}:${w.name}#${w.tag}`} s={s} platform={platform} who={w} />)}
        </ul>
      )}
    </section>
  );
};

// ---------- 아이템 ----------

const ITEM_TAGS = {
  Damage: '공격력', CriticalStrike: '치명타', AttackSpeed: '공격 속도', OnHit: '적중 시', ArmorPenetration: '방어구 관통', LifeSteal: '생명력 흡수',
  SpellDamage: '주문력', MagicPenetration: '마법 관통', Mana: '마나', AbilityHaste: '스킬 가속',
  Health: '체력', Armor: '방어력', SpellBlock: '마법 저항력', Boots: '신발', Consumable: '소모품', Trinket: '장신구', Vision: '시야',
};
const itemText = (html = '') => plain(html.replace(/<\/?(stats|mainText|passive|active|rules|flavorText)>/g, (t) => (t === '<passive>' || t === '<active>' ? '\n' : t === '</stats>' ? '\n' : '')));

const useItems = (s) => useMemo(() => {
  if (!s) return [];
  const seen = new Set();
  return Object.entries(s.items)
    .filter(([, v]) => v.maps?.['11'] && v.gold?.purchasable && v.inStore !== false && !v.hideFromAll && v.gold.total > 0 && !v.requiredChampion)
    .map(([id, v]) => ({ id, ...v, cho: choseong(v.name) }))
    .filter((v) => (seen.has(v.name) ? false : seen.add(v.name)))
    .sort((a, b) => b.gold.total - a.gold.total);
}, [s]);

const ItemTile = ({ s, it }) => (
  <li>
    <Link to={`${BASE}/items/${it.id}`} title={it.name}>
      <img src={img.item(s.ver, it.id)} alt="" width={44} height={44} loading="lazy" />
      <span>{it.name}</span>
      <small>{it.gold.total.toLocaleString()}</small>
    </Link>
  </li>
);

export const ItemList = () => {
  const [s] = useStatic();
  const items = useItems(s);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  const n = q.trim().toLowerCase().replace(/\s/g, '');
  const shown = items.filter((it) => (!tag || it.tags.includes(tag)) && (!n
    || it.name.replace(/\s/g, '').toLowerCase().includes(n) || it.cho.replace(/\s/g, '').includes(n) || (it.colloq || '').toLowerCase().split(';').some((c) => c && c.includes(n))));
  const tiers = [
    ['완성 아이템', (it) => !it.into?.length && it.gold.total >= 2000],
    ['신발', (it) => it.tags.includes('Boots')],
    ['중간 아이템', (it) => it.into?.length && it.from?.length],
    ['기본·시작 아이템', (it) => !it.from?.length && !it.tags.includes('Boots')],
  ];
  const used = new Set();
  return (
    <section>
      <Helmet>
        <title>리그 오브 레전드 아이템 목록 - 가격·능력치·조합법 | TerminalNexus</title>
        <meta name="description" content="소환사의 협곡 아이템 전체를 가격, 능력치, 조합법과 함께 이름·초성·줄임말(인피, 무대)로 찾습니다." />
      </Helmet>
      <h1 className="lol-h1">아이템</h1>
      <div className="lol-filter">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="아이템 이름, 초성, 줄임말 (예: 인피, ㅁㅎㅇ)" aria-label="아이템 검색" />
        <div className="lol-seg wrap" role="group" aria-label="능력치">
          <button type="button" className={!tag ? 'on' : ''} onClick={() => setTag('')}>전체</button>
          {Object.entries(ITEM_TAGS).map(([k, v]) => <button key={k} type="button" className={tag === k ? 'on' : ''} onClick={() => setTag(k)}>{v}</button>)}
        </div>
      </div>
      {!s && <div className="lol-card lol-loading" aria-busy="true">아이템을 불러오는 중…</div>}
      {s && tiers.map(([label, f]) => {
        const list = shown.filter((it) => !used.has(it.id) && f(it));
        list.forEach((it) => used.add(it.id));
        return list.length ? (
          <section key={label} className="lol-card">
            <h2>{label} <small className="lol-dim">{list.length}</small></h2>
            <ul className="lol-itemgrid">{list.map((it) => <ItemTile key={it.id} s={s} it={it} />)}</ul>
          </section>
        ) : null;
      })}
      {s && shown.length === 0 && <p className="lol-empty">찾는 아이템이 없습니다.</p>}
      <p className="lol-note">소환사의 협곡 상점 기준. 데이터: Riot Data Dragon {s?.ver}</p>
    </section>
  );
};

export const ItemDetail = ({ id }) => {
  const [s] = useStatic();
  const navigate = useNavigate();
  const it = s?.items[id];
  useEffect(() => { if (s && !it) navigate(`${BASE}/items`, { replace: true }); }, [s, it, navigate]);
  if (!s || !it) return <div className="lol-card lol-loading" aria-busy="true">불러오는 중…</div>;
  const link = (x) => s.items[x] && (
    <Link key={x} to={`${BASE}/items/${x}`} className="lol-itemlink" title={s.items[x].name}>
      <img src={img.item(s.ver, x)} alt="" width={36} height={36} loading="lazy" />
      <span>{s.items[x].name}<small>{s.items[x].gold.total.toLocaleString()}</small></span>
    </Link>
  );
  const into = [...new Set(it.into || [])].filter((x) => s.items[x]?.maps?.['11'] && s.items[x]?.inStore !== false);
  return (
    <article className="lol-champ">
      <Helmet>
        <title>{`${it.name} - 롤 아이템 가격·능력치·조합법 | TerminalNexus`}</title>
        <meta name="description" content={`${it.name}: ${it.plaintext || itemText(it.description).slice(0, 120)} 가격 ${it.gold.total}골드.`} />
      </Helmet>
      <p className="lol-crumb"><Link to={`${BASE}/items`}>← 아이템 목록</Link></p>
      <section className="lol-card lol-item-head">
        <img src={img.item(s.ver, id)} alt="" width={64} height={64} />
        <div>
          <h1>{it.name}</h1>
          <p><b className="lol-gold">{it.gold.total.toLocaleString()} 골드</b> <span className="lol-dim">(조합 비용 {it.gold.base.toLocaleString()} · 판매 {it.gold.sell.toLocaleString()})</span></p>
          <p className="lol-dim">{it.tags.map((t) => ITEM_TAGS[t] || null).filter(Boolean).join(' · ')}</p>
        </div>
      </section>
      <section className="lol-card">
        <h2>효과</h2>
        <p className="lol-item-desc">{itemText(it.description)}</p>
        {it.plaintext && <p className="lol-dim">{it.plaintext}</p>}
      </section>
      {(it.from?.length > 0 || into.length > 0) && (
        <div className="lol-two">
          {it.from?.length > 0 && <section className="lol-card"><h2>재료</h2><div className="lol-itemlinks">{it.from.map(link)}</div></section>}
          {into.length > 0 && <section className="lol-card"><h2>이걸로 만드는 아이템</h2><div className="lol-itemlinks">{into.map(link)}</div></section>}
        </div>
      )}
    </article>
  );
};

// ---------- 룬·소환사 주문 ----------

export const Runes = () => {
  const [s] = useStatic();
  const [runes, setRunes] = useState(null);
  const [spells, setSpells] = useState(null);
  const [tree, setTree] = useState(0);
  useEffect(() => {
    loadRunes().then(setRunes).catch(() => setRunes([]));
    loadSpells().then((l) => setSpells(l.filter((x) => x.modes.includes('CLASSIC')).sort((a, b) => a.summonerLevel - b.summonerLevel))).catch(() => setSpells([]));
  }, []);
  const t = runes?.[tree];
  return (
    <section>
      <Helmet>
        <title>리그 오브 레전드 룬과 소환사 주문 정리 | TerminalNexus</title>
        <meta name="description" content="정밀, 지배, 마법, 결의, 영감 룬 계열의 핵심 룬과 일반 룬 효과, 소환사 주문 재사용 대기시간을 정리했습니다." />
      </Helmet>
      <h1 className="lol-h1">룬 · 소환사 주문</h1>
      {!runes && <div className="lol-card lol-loading" aria-busy="true">불러오는 중…</div>}
      {runes?.length > 0 && (
        <>
          <div className="lol-seg" role="tablist" aria-label="룬 계열">
            {runes.map((r, i) => (
              <button key={r.id} type="button" role="tab" aria-selected={i === tree} className={i === tree ? 'on' : ''} onClick={() => setTree(i)}>
                <img src={img.perk(r.icon)} alt="" width={18} height={18} /> {r.name}
              </button>
            ))}
          </div>
          <section className="lol-card lol-runes">
            {t.slots.map((slot, si) => (
              <div key={si} className={`lol-rune-slot${si === 0 ? ' key' : ''}`}>
                <h3>{si === 0 ? '핵심 룬' : `${si}번째 줄`}</h3>
                <ul>
                  {slot.runes.map((r) => (
                    <li key={r.id}>
                      <img src={img.perk(r.icon)} alt="" width={si === 0 ? 48 : 36} height={si === 0 ? 48 : 36} loading="lazy" />
                      <div><strong>{r.name}</strong><p>{plain(r.shortDesc)}</p></div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}
      {spells?.length > 0 && s && (
        <section className="lol-card">
          <h2>소환사 주문 (소환사의 협곡)</h2>
          <ul className="lol-spells">
            {spells.map((sp) => (
              <li key={sp.id}>
                <img src={img.spell(s.ver, sp.image.full)} alt="" width={40} height={40} loading="lazy" />
                <div><strong>{sp.name} <small>{sp.cooldownBurn}초</small></strong><p>{plain(sp.description)}</p></div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="lol-note">데이터: Riot Data Dragon {s?.ver}</p>
    </section>
  );
};
