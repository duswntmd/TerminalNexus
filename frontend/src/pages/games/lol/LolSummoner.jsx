import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { POS, img, queueName } from './ddragon';
import { BASE, ago, fmtDur, kdaRatio, lolGet, pct, pushRecent, summonerPath, useStatic } from './lolApi';
import { ChampByKey, ChampIco, Ico, Item, Perk, RankCard, Spell, TierTag } from './lolUi';

const ARENA = new Set([1700, 1710]);
const FILTERS = [['', '전체'], ['420', '솔로랭크'], ['440', '자유랭크'], ['450', '칼바람'], ['400', '일반']];
const PAGE = 10;

// ---------- 최근 경기 요약 ----------
const Summary = ({ s, me }) => {
  const games = me.filter((x) => !x.p.remake);
  if (!games.length) return null;
  const w = games.filter((x) => x.p.win).length;
  const sum = (k) => games.reduce((a, x) => a + x.p[k], 0);
  const k = sum('kills'), d = sum('deaths'), a = sum('assists');
  const kp = games.reduce((acc, x) => acc + (x.teamKills ? (x.p.kills + x.p.assists) / x.teamKills : 0), 0) / games.length;
  const champs = Object.values(games.reduce((m, x) => {
    const c = (m[x.p.championName] ||= { name: x.p.championName, n: 0, w: 0, k: 0, d: 0, a: 0 });
    c.n++; c.w += x.p.win ? 1 : 0; c.k += x.p.kills; c.d += x.p.deaths; c.a += x.p.assists;
    return m;
  }, {})).sort((x, y) => y.n - x.n).slice(0, 3);
  const pos = games.reduce((m, x) => { if (x.p.position) m[x.p.position] = (m[x.p.position] || 0) + 1; return m; }, {});
  return (
    <section className="lol-card lol-summary">
      <div className="lol-sum-wr">
        <div className="lol-donut" style={{ '--p': pct(w, games.length) }}><b>{pct(w, games.length)}%</b></div>
        <div>
          <span className="lol-dim">최근 {games.length}게임</span>
          <strong>{w}승 {games.length - w}패</strong>
          <span className="lol-kda-line">{(k / games.length).toFixed(1)} / <em>{(d / games.length).toFixed(1)}</em> / {(a / games.length).toFixed(1)}</span>
          <span><b className="lol-ratio">{kdaRatio(k, d, a)}</b> KDA · 킬관여 {Math.round(kp * 100)}%</span>
        </div>
      </div>
      <div className="lol-sum-champs">
        <span className="lol-dim">많이 한 챔피언</span>
        {champs.map((c) => (
          <div key={c.name} className="lol-sum-champ">
            <ChampIco s={s} name={c.name} size={30} round />
            <span className={c.w / c.n >= 0.6 ? 'hi' : ''}>{pct(c.w, c.n)}%</span>
            <small>{c.w}승 {c.n - c.w}패 · {kdaRatio(c.k, c.d, c.a)}</small>
          </div>
        ))}
      </div>
      <div className="lol-sum-pos">
        <span className="lol-dim">포지션</span>
        <div>
          {Object.keys(POS).map((p) => (
            <div key={p} className="lol-posbar" title={`${POS[p]} ${pos[p] || 0}게임`}>
              <i style={{ height: `${pct(pos[p] || 0, games.length)}%` }} />
              <span>{POS[p]}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ---------- 경기 한 줄 ----------
const Match = ({ s, m, puuid, platform }) => {
  const [open, setOpen] = useState(false);
  const p = m.participants.find((x) => x.puuid === puuid);
  if (!p) return null;
  const arena = ARENA.has(m.queueId);
  const mates = m.participants.filter((x) => (arena ? x.subteam === p.subteam : x.teamId === p.teamId));
  const teamKills = mates.reduce((a, x) => a + x.kills, 0);
  const result = p.remake ? 'remake' : p.win ? 'win' : 'lose';
  const mins = Math.max(1, m.duration / 60);
  // 아레나는 2인 1조 8팀: 순위대로 나눈다
  const teams = arena
    ? [...new Set(m.participants.map((x) => x.subteam))].map((st) => m.participants.filter((x) => x.subteam === st)).sort((a, b) => a[0].placement - b[0].placement)
    : [100, 200].map((t) => m.participants.filter((x) => x.teamId === t));
  const maxDmg = Math.max(...m.participants.map((x) => x.damage), 1);
  return (
    <li className={`lol-match ${result}`}>
      <div className="lol-match-row">
        <div className="lol-m-meta">
          <b>{queueName(m.queueId, m.gameMode)}</b>
          <span title={new Date(m.end || m.start).toLocaleString('ko-KR')}>{ago(m.end || m.start)}</span>
          <i />
          <strong>{result === 'remake' ? '다시하기' : arena && p.placement ? `${p.placement}위` : p.win ? '승리' : '패배'}</strong>
          <span>{fmtDur(m.duration)}</span>
        </div>
        <div className="lol-m-champ">
          <div className="lol-m-face">
            <ChampIco s={s} name={p.championName} size={48} round />
            <span className="lol-lv">{p.champLevel}</span>
          </div>
          <div className="lol-m-spells">
            <Spell s={s} id={p.spell1} /><Spell s={s} id={p.spell2} />
          </div>
          <div className="lol-m-spells">
            <Perk s={s} id={p.keystone} className="ks" /><Perk s={s} id={p.subStyle} />
          </div>
        </div>
        <div className="lol-m-kda">
          <strong>{p.kills} / <em>{p.deaths}</em> / {p.assists}</strong>
          <span><b className="lol-ratio">{kdaRatio(p.kills, p.deaths, p.assists)}</b> KDA</span>
          {p.multiKill >= 2 && <span className={`lol-multi m${p.multiKill}`}>{['', '', '더블킬', '트리플킬', '쿼드라킬', '펜타킬'][Math.min(p.multiKill, 5)]}</span>}
        </div>
        <div className="lol-m-stats">
          <span>킬관여 <b>{pct(p.kills + p.assists, teamKills)}%</b></span>
          <span>CS {p.cs} ({(p.cs / mins).toFixed(1)})</span>
          <span>시야 {p.vision}</span>
          {p.position && <span>{POS[p.position]}</span>}
        </div>
        <div className="lol-m-items">
          {p.items.slice(0, 6).map((id, i) => <Item key={i} s={s} id={id} size={26} />)}
          <Item s={s} id={p.items[6]} size={26} />
        </div>
        <div className={`lol-m-players${arena ? ' arena' : ''}`}>
          {(arena ? [teams.flat().slice(0, 8), teams.flat().slice(8)] : teams).map((t, ti) => (
            <ul key={ti}>
              {t.map((x) => (
                <li key={x.puuid} className={x.puuid === puuid ? 'me' : ''}>
                  <ChampIco s={s} name={x.championName} size={16} />
                  <Link to={summonerPath(platform, x.name, x.tag)} title={`${x.name}#${x.tag}`}>{x.name}</Link>
                </li>
              ))}
            </ul>
          ))}
        </div>
        <button type="button" className="lol-m-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="경기 상세">
          {open ? '▲' : '▼'}
        </button>
      </div>
      {open && (
        <div className="lol-m-detail">
          {teams.map((t, ti) => {
            const team = arena ? { win: t[0].win } : m.teams.find((x) => x.teamId === (ti ? 200 : 100)) || {};
            return (
              <div key={ti} className={`lol-team ${team.win ? 'win' : 'lose'}`}>
                <div className="lol-team-head">
                  {arena ? <strong>{t[0].placement}위</strong> : <strong>{team.win ? '승리' : '패배'} ({ti ? '레드' : '블루'})</strong>}
                  {!arena && <span>킬 {team.kills} · 바론 {team.baron} · 드래곤 {team.dragon} · 포탑 {team.tower}{team.horde ? ` · 공허 유충 ${team.horde}` : ''}</span>}
                </div>
                <div className="lol-table-wrap">
                  <table className="lol-table">
                    <thead><tr><th>소환사</th><th>KDA</th><th>피해량</th><th>CS</th><th>시야</th><th>아이템</th></tr></thead>
                    <tbody>
                      {t.map((x) => {
                        const tk = t.reduce((a, y) => a + y.kills, 0);
                        return (
                          <tr key={x.puuid} className={x.puuid === puuid ? 'me' : ''}>
                            <td>
                              <div className="lol-pl">
                                <span className="lol-m-face sm"><ChampIco s={s} name={x.championName} size={30} /><span className="lol-lv">{x.champLevel}</span></span>
                                <span className="lol-m-spells"><Spell s={s} id={x.spell1} size={15} /><Spell s={s} id={x.spell2} size={15} /></span>
                                <span className="lol-m-spells"><Perk s={s} id={x.keystone} size={15} /><Perk s={s} id={x.subStyle} size={15} /></span>
                                <Link to={summonerPath(platform, x.name, x.tag)}>{x.name}<small>#{x.tag}</small></Link>
                              </div>
                            </td>
                            <td><b>{x.kills}/{x.deaths}/{x.assists}</b><small>{kdaRatio(x.kills, x.deaths, x.assists)} · {pct(x.kills + x.assists, tk)}%</small></td>
                            <td><span className="lol-dmg"><i style={{ width: `${(x.damage / maxDmg) * 100}%` }} /></span><small>{x.damage.toLocaleString()}</small></td>
                            <td>{x.cs}<small>{(x.cs / mins).toFixed(1)}/분</small></td>
                            <td>{x.vision}<small>제어 와드 {x.pinkWards}</small></td>
                            <td><div className="lol-items-sm">{x.items.map((id, i) => <Item key={i} s={s} id={id} size={20} />)}</div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {team.bans?.some((b) => b > 0) && (
                  <div className="lol-bans"><span>금지</span>{team.bans.filter((b) => b > 0).map((b, i) => <ChampByKey key={i} s={s} id={b} size={20} />)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </li>
  );
};

// ---------- 인게임 ----------
const splitRiotId = (id) => { const i = id.lastIndexOf('#'); return i > 0 ? [id.slice(0, i), id.slice(i + 1)] : [id, '']; };
const LiveGame = ({ s, live, puuid, platform }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const secs = live.gameStartTime > 0 ? Math.floor((now - live.gameStartTime) / 1000) : live.gameLength;
  return (
    <section className="lol-card lol-live">
      <div className="lol-live-head">
        <h2><span className="tn-led" aria-hidden="true" /> 지금 게임 중</h2>
        <span>{queueName(live.queueId, live.gameMode)} · {secs > 0 ? fmtDur(secs) : '로딩 중'}</span>
      </div>
      <div className="lol-live-teams">
        {[100, 200].map((t) => (
          <ul key={t} className={t === 100 ? 'blue' : 'red'}>
            {live.participants.filter((p) => p.teamId === t).map((p, i) => (
              <li key={p.puuid || i} className={p.puuid === puuid ? 'me' : ''}>
                <ChampByKey s={s} id={p.championId} size={32} />
                <span className="lol-m-spells"><Spell s={s} id={p.spell1Id} size={15} /><Spell s={s} id={p.spell2Id} size={15} /></span>
                <span className="lol-m-spells"><Perk s={s} id={p.perk0} size={15} /><Perk s={s} id={p.perkSub} size={15} /></span>
                <span className="lol-live-name">
                  {p.riotId ? <Link to={summonerPath(platform, ...splitRiotId(p.riotId))}>{p.riotId.split('#')[0]}</Link> : s?.byKey[p.championId]?.name}
                  <small>{s?.byKey[p.championId]?.name}</small>
                </span>
                <TierTag r={p.solo} />
              </li>
            ))}
          </ul>
        ))}
      </div>
      {live.bans?.length > 0 && (
        <div className="lol-bans"><span>금지</span>{live.bans.filter((b) => b.championId > 0).map((b, i) => <ChampByKey key={i} s={s} id={b.championId} size={20} />)}</div>
      )}
    </section>
  );
};

// ---------- 숙련도 ----------
const Mastery = ({ s, platform, puuid }) => {
  const [list, setList] = useState(null);
  useEffect(() => {
    let alive = true;
    lolGet(`mastery?platform=${platform}&puuid=${encodeURIComponent(puuid)}&count=7`).then((l) => alive && setList([...l].sort((x, y) => y.points - x.points).slice(0, 7))).catch(() => alive && setList([]));
    return () => { alive = false; };
  }, [platform, puuid]);
  if (!list?.length) return null;
  const max = list[0].points || 1;
  return (
    <section className="lol-card lol-mastery">
      <h2>챔피언 숙련도</h2>
      <ul>
        {list.map((m) => {
          const c = s?.byKey[m.championId];
          return (
            <li key={m.championId}>
              {c ? <Link to={`${BASE}/champions/${c.id}`}><ChampByKey s={s} id={m.championId} size={34} /></Link> : <ChampByKey s={s} id={m.championId} size={34} />}
              <div>
                <strong>{c?.name || m.championId}</strong>
                <span className="lol-dmg"><i style={{ width: `${(m.points / max) * 100}%` }} /></span>
              </div>
              <span className="lol-mastery-n"><b>{m.points.toLocaleString()}</b><small>레벨 {m.level}</small></span>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

// ---------- 페이지 ----------
export default function LolSummoner({ platform, name, tag }) {
  const [s] = useStatic();
  const [profile, setProfile] = useState(null);
  const [err, setErr] = useState(null);
  const [matches, setMatches] = useState([]);
  const [mErr, setMErr] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [queue, setQueue] = useState('');
  const [live, setLive] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    setErr(null);
    try {
      const p = await lolGet(`summoner?platform=${platform}&name=${encodeURIComponent(name)}&tag=${encodeURIComponent(tag)}`);
      setProfile(p);
      pushRecent({ platform, name: p.gameName, tag: p.tagLine, icon: p.profileIconId });
      return p;
    } catch (e) {
      setErr(e.message);
      setProfile(null);
      return null;
    }
  }, [platform, name, tag]);

  const loadMatches = useCallback(async (p, start, q) => {
    setLoadingMore(true); setMErr(null);
    try {
      const list = await lolGet(`matches?platform=${platform}&puuid=${encodeURIComponent(p.puuid)}&start=${start}&count=${PAGE}${q ? `&queue=${q}` : ''}`);
      setMatches((prev) => (start ? [...prev, ...list] : list));
      setHasMore(list.length === PAGE);
    } catch (e) {
      setMErr(e.message);
    } finally {
      setLoadingMore(false);
    }
  }, [platform]);

  const loadLive = useCallback((p) => {
    lolGet(`live?platform=${platform}&puuid=${encodeURIComponent(p.puuid)}`).then((l) => setLive(l.inGame ? l : null)).catch(() => setLive(null));
  }, [platform]);

  useEffect(() => {
    let alive = true;
    setProfile(null); setMatches([]); setLive(null); setQueue(''); setHasMore(true);
    loadProfile().then((p) => { if (alive && p) { loadMatches(p, 0, ''); loadLive(p); } });
    return () => { alive = false; };
  }, [loadProfile, loadMatches, loadLive]);

  const changeQueue = (q) => {
    if (q === queue || !profile) return;
    setQueue(q); setMatches([]); setHasMore(true);
    loadMatches(profile, 0, q);
  };
  const refresh = async () => {
    setRefreshing(true);
    const p = await loadProfile();
    if (p) { await loadMatches(p, 0, queue); loadLive(p); }
    setRefreshing(false);
  };

  const me = useMemo(() => (profile ? matches.map((m) => {
    const p = m.participants.find((x) => x.puuid === profile.puuid);
    if (!p) return null;
    return { p, teamKills: m.participants.filter((x) => x.teamId === p.teamId).reduce((a, x) => a + x.kills, 0) };
  }).filter(Boolean) : []), [matches, profile]);

  const title = `${name}#${tag}`;
  const solo = profile?.ranks.find((r) => r.queue === 'RANKED_SOLO_5x5');
  const flex = profile?.ranks.find((r) => r.queue === 'RANKED_FLEX_SR');

  return (
    <>
      <Helmet>
        <title>{`${title} 전적 검색 | TerminalNexus`}</title>
        <meta name="description" content={`리그 오브 레전드 ${title} 소환사의 랭크, 최근 전적, 많이 한 챔피언을 확인합니다.`} />
        <meta name="robots" content="noindex" />
      </Helmet>
      {err && (
        <div className="lol-card lol-error" role="alert">
          <strong>{err}</strong>
          <p>찾은 이름: <code>{title}</code> · 서버 {platform.toUpperCase()}</p>
          <Link to={BASE}>다시 검색하기</Link>
        </div>
      )}
      {!err && !profile && <div className="lol-card lol-loading" aria-busy="true">소환사 정보를 불러오는 중…</div>}
      {profile && (
        <>
          <section className="lol-profile">
            <div className="lol-pf-icon">
              <Ico src={s ? img.profile(s.ver, profile.profileIconId) : null} size={88} />
              <span className="lol-pf-lv">{profile.summonerLevel}</span>
            </div>
            <div className="lol-pf-name">
              <h1>{profile.gameName} <span>#{profile.tagLine}</span></h1>
              <p className="lol-dim">{profile.platform.toUpperCase()} 서버 · 갱신 {ago(profile.fetchedAt)}{live && <> · <b className="lol-ingame">게임 중</b></>}</p>
              <button type="button" className="lol-btn" onClick={refresh} disabled={refreshing}>{refreshing ? '갱신 중…' : '전적 갱신'}</button>
            </div>
          </section>

          {live && <LiveGame s={s} live={live} puuid={profile.puuid} platform={platform} />}

          <div className="lol-grid">
            <aside className="lol-side">
              <RankCard title="솔로랭크" r={solo} />
              <RankCard title="자유랭크" r={flex} />
              <Mastery s={s} platform={platform} puuid={profile.puuid} />
            </aside>
            <div className="lol-main">
              <div className="lol-seg" role="tablist" aria-label="게임 종류">
                {FILTERS.map(([q, label]) => (
                  <button key={q || 'all'} type="button" role="tab" aria-selected={queue === q} className={queue === q ? 'on' : ''} onClick={() => changeQueue(q)}>{label}</button>
                ))}
              </div>
              <Summary s={s} me={me} />
              {mErr && <div className="lol-card lol-error" role="alert"><strong>{mErr}</strong></div>}
              <ul className="lol-matches">
                {matches.map((m) => <Match key={m.id} s={s} m={m} puuid={profile.puuid} platform={platform} />)}
              </ul>
              {loadingMore && <div className="lol-card lol-loading" aria-busy="true">경기 기록을 불러오는 중…</div>}
              {!loadingMore && matches.length === 0 && !mErr && <div className="lol-card lol-loading">기록된 경기가 없습니다.</div>}
              {!loadingMore && hasMore && matches.length > 0 && (
                <button type="button" className="lol-more" onClick={() => loadMatches(profile, matches.length, queue)}>더 보기</button>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
