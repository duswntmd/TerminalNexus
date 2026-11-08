import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { PLATFORMS, img } from './ddragon';
import { BASE, getRecent, lolGet, parseInput, parseRiotId, removeRecent, summonerPath, useStatic } from './lolApi';
import LolSummoner from './LolSummoner';
import { ChampionDetail, ChampionGrid, ChampionList } from './LolChampions';
import { ItemDetail, ItemList, MultiSearch, Ranking, Runes } from './LolExtra';
import './LolPage.css';

const usePlatform = () => {
  const [p, setP] = useState(() => { try { return localStorage.getItem('lol.platform') || 'kr'; } catch { return 'kr'; } });
  const set = (v) => { setP(v); try { localStorage.setItem('lol.platform', v); } catch { /* 무시 */ } };
  return [p, set];
};
const defTag = (p) => PLATFORMS.find((x) => x[0] === p)?.[2] || 'KR1';

const SearchBox = ({ big }) => {
  const [platform, setPlatform] = usePlatform();
  const [text, setText] = useState('');
  const navigate = useNavigate();
  const ref = useRef(null);
  // Ctrl+K 로 검색창으로
  useEffect(() => {
    const on = (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus(); } };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);
  const submit = (e) => {
    e.preventDefault();
    const { name, tag } = parseInput(text, defTag(platform));
    if (!name) return;
    setText('');
    navigate(summonerPath(platform, name, tag));
  };
  return (
    <form className={`lol-search${big ? ' big' : ''}`} onSubmit={submit} role="search">
      <select value={platform} onChange={(e) => setPlatform(e.target.value)} aria-label="서버">
        {PLATFORMS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
      <input ref={ref} value={text} onChange={(e) => setText(e.target.value)} placeholder={`소환사 이름#${defTag(platform)}`} aria-label="소환사 이름#태그" autoComplete="off" spellCheck={false} />
      <button type="submit">검색</button>
    </form>
  );
};

const Home = () => {
  const [s] = useStatic();
  const [recent, setRecent] = useState(getRecent);
  const [q, setQ] = useState('');
  const [free, setFree] = useState(null);
  useEffect(() => {
    lolGet('rotation?platform=kr').then((r) => setFree(new Set(r.freeChampionIds || []))).catch(() => setFree(null));
  }, []);
  const freeList = useMemo(() => (s && free ? s.champions.filter((c) => free.has(c.key)) : []), [s, free]);
  return (
    <>
      <Helmet>
        <title>롤 전적 검색 - 리그 오브 레전드 소환사·챔피언 | TerminalNexus</title>
        <meta name="description" content="리그 오브 레전드 소환사 이름#태그로 랭크, 최근 전적, 많이 한 챔피언, 지금 하는 게임을 확인하고 챔피언을 초성으로 찾습니다." />
      </Helmet>
      <section className="lol-hero">
        <h1>롤 전적 검색</h1>
        <p>소환사 이름과 태그로 랭크와 최근 전적을 확인하세요. <kbd>Ctrl</kbd>+<kbd>K</kbd>로 바로 검색창으로 갑니다.</p>
        <SearchBox big />
        {recent.length > 0 && (
          <div className="lol-recent">
            <span className="lol-dim">최근 검색</span>
            <ul>
              {recent.map((r) => (
                <li key={`${r.platform}:${r.name}#${r.tag}`}>
                  <Link to={summonerPath(r.platform, r.name, r.tag)}>
                    {s && r.icon != null && <img src={img.profile(s.ver, r.icon)} alt="" width={20} height={20} />}
                    {r.name}<small>#{r.tag}</small>
                  </Link>
                  <button type="button" aria-label={`${r.name} 최근 검색에서 지우기`} onClick={() => { removeRecent(r); setRecent(getRecent()); }}>×</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <ul className="lol-quick">
        <li><Link to={`${BASE}/multi`}><b>멀티서치</b><span>로비 채팅 붙여 넣고 팀원 5명 한 번에</span></Link></li>
        <li><Link to={`${BASE}/ranking`}><b>랭킹</b><span>챌린저·그랜드마스터 LP 순위</span></Link></li>
        <li><Link to={`${BASE}/items`}><b>아이템</b><span>가격·능력치·조합법, 줄임말 검색</span></Link></li>
        <li><Link to={`${BASE}/runes`}><b>룬·주문</b><span>룬 계열별 효과와 소환사 주문</span></Link></li>
      </ul>

      {freeList.length > 0 && (
        <section className="lol-card">
          <h2>이번 주 무료 챔피언</h2>
          <ul className="lol-champs small">
            {freeList.map((c) => (
              <li key={c.id}><Link to={`${BASE}/champions/${c.id}`} title={c.name}><img src={img.champ(s.ver, c.id)} alt="" width={44} height={44} loading="lazy" /><span>{c.name}</span></Link></li>
            ))}
          </ul>
        </section>
      )}

      <section className="lol-card">
        <div className="lol-card-head">
          <h2>챔피언 검색</h2>
          <Link to={`${BASE}/champions`}>전체 보기 →</Link>
        </div>
        <input className="lol-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 또는 초성 (예: ㅇㅅ → 애쉬, 리신 → 리 신)" aria-label="챔피언 검색" />
        {q && <ChampionGrid s={s} q={q} />}
      </section>
    </>
  );
};

export default function LolPage() {
  const { section, platform, riotId, champ } = useParams();
  let body;
  if (section === 'summoner' && platform && riotId) {
    const { name, tag } = parseRiotId(riotId);
    body = <LolSummoner key={`${platform}/${riotId}`} platform={platform} name={name} tag={tag} />;
  } else if (section === 'champions') {
    body = champ ? <ChampionDetail id={champ} /> : <ChampionList />;
  } else if (section === 'items') {
    body = champ ? <ItemDetail id={champ} /> : <ItemList />;
  } else if (section === 'ranking') {
    body = <Ranking />;
  } else if (section === 'multi') {
    body = <MultiSearch />;
  } else if (section === 'runes') {
    body = <Runes />;
  } else {
    body = <Home />;
  }
  return (
    <div className="lol-page">
      <nav className="lol-top" aria-label="롤 전적 메뉴">
        <Link to={BASE} className="lol-brand"><span aria-hidden="true">LoL</span> 전적 검색</Link>
        <NavLink to={BASE} end>홈</NavLink>
        <NavLink to={`${BASE}/multi`}>멀티서치</NavLink>
        <NavLink to={`${BASE}/ranking`}>랭킹</NavLink>
        <NavLink to={`${BASE}/champions`}>챔피언</NavLink>
        <NavLink to={`${BASE}/items`}>아이템</NavLink>
        <NavLink to={`${BASE}/runes`}>룬</NavLink>
        {section && <div className="lol-top-search"><SearchBox /></div>}
      </nav>
      {body}
      <footer className="lol-legal">
        <p>TerminalNexus는 Riot Games의 보증을 받지 않았으며 Riot Games 또는 Riot Games 자산의 제작·관리에 공식적으로 관여한 사람의 견해나 의견을 반영하지 않습니다. League of Legends와 Riot Games는 Riot Games, Inc.의 상표 또는 등록 상표입니다.</p>
        <p lang="en">TerminalNexus isn&apos;t endorsed by Riot Games and doesn&apos;t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.</p>
      </footer>
    </div>
  );
}
