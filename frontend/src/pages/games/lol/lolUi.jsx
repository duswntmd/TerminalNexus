// 롤 화면 여러 곳이 같이 쓰는 작은 그림 조각들
import React from 'react';
import { TIERS, champId, img } from './ddragon';
import { pct } from './lolApi';

export const Ico = ({ src, alt = '', size = 24, className = '', round }) => (
  src ? <img className={`lol-ico ${round ? 'round' : ''} ${className}`} src={src} alt={alt} title={alt || undefined} width={size} height={size} loading="lazy" decoding="async" />
    : <span className={`lol-ico empty ${className}`} style={{ width: size, height: size }} aria-hidden="true" />
);

export const ChampIco = ({ s, name, size = 24, round }) => {
  const c = s?.champions.find((x) => x.id === champId(name));
  return <Ico src={s ? img.champ(s.ver, champId(name)) : null} alt={c?.name || name} size={size} round={round} />;
};
export const ChampByKey = ({ s, id, size = 24 }) => {
  const c = s?.byKey[id];
  return c ? <Ico src={img.champ(s.ver, c.id)} alt={c.name} size={size} /> : <Ico size={size} />;
};
export const Spell = ({ s, id, size = 22 }) => {
  const sp = s?.spells[id];
  return <Ico src={sp ? img.spell(s.ver, `${sp.id}.png`) : null} alt={sp?.name} size={size} />;
};
export const Perk = ({ s, id, size = 22, className }) => {
  const p = s?.perks[id];
  return <Ico src={p ? img.perk(p.icon) : null} alt={p?.name} size={size} className={className} round />;
};
export const Item = ({ s, id, size = 24 }) => {
  const it = id && s?.items[id];
  return it ? <Ico src={img.item(s.ver, id)} alt={it.name} size={size} /> : <span className="lol-ico empty" style={{ width: size, height: size }} aria-hidden="true" />;
};

// ---------- 랭크 ----------
export const RankCard = ({ title, r }) => {
  if (!r) return (
    <div className="lol-rank unranked"><span className="lol-rank-q">{title}</span><strong>배치 전 / 기록 없음</strong></div>
  );
  const games = r.wins + r.losses;
  const tierKey = r.tier.toLowerCase();
  const apex = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(r.tier);
  return (
    <div className={`lol-rank t-${tierKey}`}>
      <span className="lol-rank-q">{title}</span>
      <div className="lol-rank-main">
        <span className={`lol-emblem t-${tierKey}`} aria-hidden="true">{r.tier[0]}</span>
        <div>
          <strong>{TIERS[r.tier] || r.tier} {apex ? '' : r.rank}</strong>
          <span>{r.lp} LP{r.hotStreak && <em className="lol-hot"> 연승 중</em>}</span>
        </div>
        <div className="lol-rank-wr">
          <b>{pct(r.wins, games)}%</b>
          <span>{r.wins}승 {r.losses}패</span>
        </div>
      </div>
      <div className="lol-bar"><i style={{ width: `${pct(r.wins, games)}%` }} /></div>
    </div>
  );
};


/** 짧은 랭크 표시 (인게임·멀티서치) */
export const TierTag = ({ r }) => {
  if (!r) return <span className="lol-tier none">언랭</span>;
  const apex = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(r.tier);
  const g = r.wins + r.losses;
  return (
    <span className={`lol-tier t-${r.tier.toLowerCase()}`} title={`${TIERS[r.tier] || r.tier} ${apex ? '' : r.rank} ${r.lp}LP · ${r.wins}승 ${r.losses}패`}>
      {TIERS[r.tier] || r.tier}{apex ? ` ${r.lp}LP` : ` ${r.rank}`}<small>{pct(r.wins, g)}% ({g})</small>
    </span>
  );
};
