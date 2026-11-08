import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { TAGS, champScore, img, loadChampion, plain } from './ddragon';
import { BASE, useStatic } from './lolApi';

export const ChampionGrid = ({ s, q, tag, highlight }) => {
  const list = useMemo(() => (s ? s.champions
    .map((c) => [c, champScore(c, q)])
    .filter(([c, sc]) => sc > 0 && (!tag || c.tags.includes(tag)))
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c) : []), [s, q, tag]);
  if (!s) return <div className="lol-card lol-loading" aria-busy="true">챔피언 목록을 불러오는 중…</div>;
  return (
    <>
      <ul className="lol-champs">
        {list.map((c) => (
          <li key={c.id} className={highlight?.has(c.key) ? 'free' : ''}>
            <Link to={`${BASE}/champions/${c.id}`} title={`${c.name} - ${c.title}`}>
              <img src={img.champ(s.ver, c.id)} alt="" width={56} height={56} loading="lazy" decoding="async" />
              <span>{c.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p className="lol-empty">찾는 챔피언이 없습니다.</p>}
    </>
  );
};

export const ChampionList = () => {
  const [s] = useStatic();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState('');
  return (
    <section>
      <Helmet>
        <title>리그 오브 레전드 챔피언 목록과 스킬 | TerminalNexus</title>
        <meta name="description" content="리그 오브 레전드 챔피언 전체를 이름이나 초성(ㅇㅅ → 애쉬)으로 찾고, 역할군별로 거르고, 스킬과 기본 능력치를 확인합니다." />
      </Helmet>
      <h1 className="lol-h1">챔피언</h1>
      <div className="lol-filter">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="챔피언 이름 또는 초성 (예: ㅇㅅ)" aria-label="챔피언 검색" autoFocus />
        <div className="lol-seg" role="group" aria-label="역할군">
          <button type="button" className={!tag ? 'on' : ''} onClick={() => setTag('')}>전체</button>
          {Object.entries(TAGS).map(([k, v]) => <button key={k} type="button" className={tag === k ? 'on' : ''} onClick={() => setTag(k)}>{v}</button>)}
        </div>
      </div>
      <ChampionGrid s={s} q={q} tag={tag} />
    </section>
  );
};

const KEYS = ['Q', 'W', 'E', 'R'];
const STAT_ROWS = [
  ['체력', 'hp', 'hpperlevel'], ['체력 재생', 'hpregen', 'hpregenperlevel'], ['자원', 'mp', 'mpperlevel'],
  ['공격력', 'attackdamage', 'attackdamageperlevel'], ['공격 속도', 'attackspeed', 'attackspeedperlevel', '%'],
  ['방어력', 'armor', 'armorperlevel'], ['마법 저항력', 'spellblock', 'spellblockperlevel'],
  ['이동 속도', 'movespeed'], ['사거리', 'attackrange'],
];

export const ChampionDetail = ({ id }) => {
  const [s] = useStatic();
  const [c, setC] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let alive = true;
    setC(null); setErr(null);
    loadChampion(id).then((d) => alive && setC(d)).catch(() => alive && setErr(true));
    return () => { alive = false; };
  }, [id]);
  if (s && !s.champions.some((x) => x.id === id)) return <Navigate to={`${BASE}/champions`} replace />;
  if (err) return <div className="lol-card lol-error">챔피언 정보를 불러오지 못했습니다.</div>;
  if (!c || !s) return <div className="lol-card lol-loading" aria-busy="true">불러오는 중…</div>;
  const st = c.stats;
  return (
    <article className="lol-champ">
      <Helmet>
        <title>{`${c.name} 스킬과 능력치 - 리그 오브 레전드 | TerminalNexus`}</title>
        <meta name="description" content={`${c.name}(${c.title}) 스킬 ${c.spells.map((x) => x.name).join(', ')}, 기본 능력치와 플레이 팁.`} />
      </Helmet>
      <p className="lol-crumb"><Link to={`${BASE}/champions`}>← 챔피언 목록</Link></p>
      <header className="lol-champ-head" style={{ '--splash': `url(${img.champSplash(c.id)})` }}>
        <img src={img.champ(s.ver, c.id)} alt="" width={96} height={96} />
        <div>
          <span className="lol-dim">{c.title}</span>
          <h1>{c.name}</h1>
          <p>{c.tags.map((t) => TAGS[t] || t).join(' · ')} · {c.partype || '자원 없음'} · 난이도 {c.info.difficulty}/10</p>
        </div>
      </header>

      <section className="lol-card">
        <h2>스킬</h2>
        <ul className="lol-skills">
          <li>
            <img src={img.passive(s.ver, c.passive.image.full)} alt="" width={48} height={48} loading="lazy" />
            <div><strong><kbd>P</kbd> {c.passive.name}</strong><p>{plain(c.passive.description)}</p></div>
          </li>
          {c.spells.map((sp, i) => (
            <li key={sp.id}>
              <img src={img.spell(s.ver, sp.image.full)} alt="" width={48} height={48} loading="lazy" />
              <div>
                <strong><kbd>{KEYS[i]}</kbd> {sp.name}</strong>
                <p>{plain(sp.description)}</p>
                <small>재사용 대기시간 {sp.cooldownBurn}초{sp.costBurn && sp.costBurn !== '0' ? ` · 소모 ${sp.costBurn}` : ''}{sp.rangeBurn && sp.rangeBurn !== 'self' ? ` · 사거리 ${sp.rangeBurn}` : ''}</small>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="lol-two">
        <section className="lol-card">
          <h2>기본 능력치</h2>
          <table className="lol-table lol-stats">
            <tbody>
              {STAT_ROWS.map(([label, base, per, unit]) => (
                <tr key={base}>
                  <th>{label}</th>
                  <td>{st[base]}{per && st[per] ? <small> (레벨당 +{st[per]}{unit || ''})</small> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="lol-card">
          <h2>플레이 팁</h2>
          {c.allytips?.length > 0 && <><h3>이 챔피언으로 할 때</h3><ul className="lol-tips">{c.allytips.map((t) => <li key={t}>{t}</li>)}</ul></>}
          {c.enemytips?.length > 0 && <><h3>상대할 때</h3><ul className="lol-tips">{c.enemytips.map((t) => <li key={t}>{t}</li>)}</ul></>}
          {!c.allytips?.length && !c.enemytips?.length && <p className="lol-dim">등록된 팁이 없습니다.</p>}
        </section>
      </div>

      <section className="lol-card">
        <h2>스킨</h2>
        <ul className="lol-skins">
          {c.skins.filter((k) => k.num > 0).map((k) => (
            <li key={k.id}><img src={img.champTile(c.id, k.num)} alt="" loading="lazy" decoding="async" onError={(e) => { e.currentTarget.parentElement.hidden = true; }} /><span>{k.name}</span></li>
          ))}
        </ul>
      </section>

      <section className="lol-card">
        <h2>배경 이야기</h2>
        <p className="lol-lore">{plain(c.lore)}</p>
      </section>
    </article>
  );
};
