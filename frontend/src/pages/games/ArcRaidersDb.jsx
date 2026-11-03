import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CHECKED } from '../../content/arcRaiders';
import {
  AMMO, BASE, DB_CHECKED, DB_SOURCES, ITEMS, ITEM_CATS, QUESTS, QUEST_MAPS, RARITIES, RARITY_KO, STATIONS, TRADERS,
  WEAPONS, WEAPON_CLASSES, WEAPON_CLASS_KO, arcPartUses, itemUses, pathFor, slugify, wikiUrl,
} from '../../content/arcRaidersDb';

// 출처 링크. 'page'는 해당 이름의 위키 문서
export const DbSrc = ({ ids, name, note }) => (
  <span className="ar-src">
    {ids.map((id) => {
      const s = id === 'page' ? { name: `ARC Raiders Wiki: ${name}`, url: wikiUrl(name) } : DB_SOURCES[id];
      return <a key={id} href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a>;
    })}
    {note && <em>{note}</em>}
  </span>
);

const DbFoot = ({ ids, name }) => {
  const { t } = useTranslation();
  return (
    <footer className="ar-foot">
      <span>{t('arc.checked', { date: DB_CHECKED })}</span>
      <span>{t('arc.sources')}: </span>
      <DbSrc ids={[...new Set(ids)]} name={name} />
      <span>{t('arc.db_license')}</span>
    </footer>
  );
};

// 이름을 이 사이트의 상세 페이지로 연결(없으면 글자만)
export const Name = ({ n }) => {
  const to = pathFor(n);
  return to ? <Link to={to}>{n}</Link> : <>{n}</>;
};
const QtyList = ({ list }) => (
  <>{list.map(([qty, n], i) => <React.Fragment key={n}>{i > 0 && ', '}<Name n={n} /> ×{qty.toLocaleString('en-US')}</React.Fragment>)}</>
);
const Rarity = ({ r }) => (r ? <span className={`ar-rar r-${r.toLowerCase()}`}>{RARITY_KO[r]}</span> : <span className="ar-dim">확인 필요</span>);

// URL 쿼리와 묶인 필터(공유한 주소로 같은 결과를 볼 수 있게)
const useFilters = (keys) => {
  const [params, setParams] = useSearchParams();
  const values = Object.fromEntries(keys.map((k) => [k, params.get(k) || '']));
  const set = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };
  return [values, set];
};
const match = (text, q) => !q || text.toLowerCase().includes(q.trim().toLowerCase());

const Select = ({ label, value, onChange, options }) => {
  const { t } = useTranslation();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">{label}: {t('arc.all')}</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
};

export const Weapons = () => {
  const { t } = useTranslation();
  const [f, set] = useFilters(['q', 'cls', 'ammo', 'rarity']);
  const rows = WEAPONS.filter((w) => match(`${w.name} ${WEAPON_CLASS_KO[w.cls]}`, f.q)
    && (!f.cls || w.cls === f.cls) && (!f.ammo || w.ammo === f.ammo) && (!f.rarity || w.rarity === f.rarity));
  return (
    <section className="ar-sec">
      <h2>{t('arc.weapons_title')}</h2>
      <div className="ar-filters four">
        <input type="search" value={f.q} onChange={(e) => set('q', e.target.value)} placeholder={t('arc.search')} aria-label={t('arc.search')} />
        <Select label={t('arc.col_class')} value={f.cls} onChange={(v) => set('cls', v)} options={WEAPON_CLASSES.map((c) => [c, WEAPON_CLASS_KO[c]])} />
        <Select label={t('arc.col_ammo')} value={f.ammo} onChange={(v) => set('ammo', v)} options={AMMO.map((a) => [a, a])} />
        <Select label={t('arc.col_rarity')} value={f.rarity} onChange={(v) => set('rarity', v)} options={RARITIES.map((r) => [r, RARITY_KO[r]])} />
      </div>
      <p className="ar-count">{t('arc.count', { n: rows.length, total: WEAPONS.length })}</p>
      <div className="ar-table-wrap">
        <table className="ar-table ar-stack">
          <thead><tr><th>{t('arc.col_name')}</th><th>{t('arc.col_class')}</th><th>{t('arc.col_ammo')}</th><th>{t('arc.col_rarity')}</th><th>{t('arc.col_craft')}</th><th>{t('arc.col_shop')}</th></tr></thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.slug} id={w.slug}>
                <td data-label={t('arc.col_name')}><strong>{w.name}</strong>{w.note && <small>{w.note}</small>}</td>
                <td data-label={t('arc.col_class')}>{WEAPON_CLASS_KO[w.cls]}</td>
                <td data-label={t('arc.col_ammo')}>{w.ammo}</td>
                <td data-label={t('arc.col_rarity')}><Rarity r={w.rarity} /></td>
                <td data-label={t('arc.col_craft')}>{w.craft ? <Link to={`${BASE}/workshop#gunsmith`}>{w.craft}</Link> : <span className="ar-dim">{t('arc.not_in_list')}</span>}</td>
                <td data-label={t('arc.col_shop')}>{w.shop ? <Link to={`${BASE}/traders#tian-wen`}>Tian Wen</Link> : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="ar-empty">{t('arc.empty')}</p>}
      </div>
      <p className="ar-hint">{t('arc.weapons_hint')}</p>
      <DbFoot ids={['wWeapons', 'dxWeapons', 'wWorkshop', 'page']} name="Tian Wen" />
    </section>
  );
};

export const Items = () => {
  const { t } = useTranslation();
  const [f, set] = useFilters(['q', 'cat', 'rarity', 'sort']);
  const rows = ITEMS.filter((i) => match(i.name, f.q) && (!f.cat || i.cat === f.cat) && (!f.rarity || i.rarity === f.rarity))
    .sort((a, b) => (f.sort === 'sell' ? b.sell - a.sell : 0));
  return (
    <section className="ar-sec">
      <h2>{t('arc.items_title')}</h2>
      <div className="ar-filters four">
        <input type="search" value={f.q} onChange={(e) => set('q', e.target.value)} placeholder={t('arc.search')} aria-label={t('arc.search')} />
        <Select label={t('arc.col_cat')} value={f.cat} onChange={(v) => set('cat', v)} options={Object.entries(ITEM_CATS)} />
        <Select label={t('arc.col_rarity')} value={f.rarity} onChange={(v) => set('rarity', v)} options={RARITIES.slice(0, 4).map((r) => [r, RARITY_KO[r]])} />
        <select value={f.sort} onChange={(e) => set('sort', e.target.value)} aria-label={t('arc.sort')}>
          <option value="">{t('arc.sort')}: {t('arc.sort_default')}</option>
          <option value="sell">{t('arc.sort')}: {t('arc.sort_sell')}</option>
        </select>
      </div>
      <p className="ar-count">{t('arc.count', { n: rows.length, total: ITEMS.length })}</p>
      <div className="ar-table-wrap">
        <table className="ar-table ar-stack">
          <thead><tr><th>{t('arc.col_name')}</th><th>{t('arc.col_cat')}</th><th>{t('arc.col_rarity')}</th><th>{t('arc.col_sell')}</th><th>{t('arc.col_stack')}</th><th>{t('arc.col_recycle')}</th></tr></thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.slug}>
                <td data-label={t('arc.col_name')}><Link to={`${BASE}/items/${i.slug}`}><strong>{i.name}</strong></Link></td>
                <td data-label={t('arc.col_cat')}>{ITEM_CATS[i.cat]}</td>
                <td data-label={t('arc.col_rarity')}><Rarity r={i.rarity} /></td>
                <td data-label={t('arc.col_sell')} className="ar-num">{i.sell.toLocaleString('en-US')}</td>
                <td data-label={t('arc.col_stack')} className="ar-num">{i.stack}</td>
                <td data-label={t('arc.col_recycle')}>{i.recycle === null ? t('arc.no_recycle') : i.recycle ? <QtyList list={i.recycle} /> : <span className="ar-dim">확인 필요</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="ar-empty">{t('arc.empty')}</p>}
      </div>
      <p className="ar-hint">{t('arc.items_hint')}</p>
      <DbFoot ids={['wItems', 'wWorkshop', 'dx']} />
    </section>
  );
};

const Uses = ({ name }) => {
  const { t } = useTranslation();
  const u = itemUses(name);
  const none = !u.upgrades.length && !u.turnIns.length && !u.rewards.length && !u.recycledFrom.length && !u.droppedBy.length;
  return (
    <>
      {u.droppedBy.length > 0 && <><h3>{t('arc.dropped_by')}</h3><ul>{u.droppedBy.map((a) => <li key={a.slug}><Link to={`${BASE}/arc/${a.slug}`}>{a.name}</Link></li>)}</ul></>}
      {u.upgrades.length > 0 && <><h3>{t('arc.used_upgrade')}</h3><ul>{u.upgrades.map((x) => <li key={x.station.slug + x.level}><Link to={`${BASE}/workshop#${x.station.slug}`}>{x.station.name} {x.level}</Link> ×{x.qty}</li>)}</ul></>}
      {u.turnIns.length > 0 && <><h3>{t('arc.used_quest')}</h3><ul>{u.turnIns.map((x) => <li key={x.slug}><Link to={`${BASE}/quests#${x.slug}`}>{x.name}</Link> ({x.giver})</li>)}</ul></>}
      {u.rewards.length > 0 && <><h3>{t('arc.reward_of')}</h3><ul>{u.rewards.map((x) => <li key={x.slug}><Link to={`${BASE}/quests#${x.slug}`}>{x.name}</Link> ({x.giver})</li>)}</ul></>}
      {u.recycledFrom.length > 0 && <><h3>{t('arc.recycled_from')}</h3><ul>{u.recycledFrom.map((x) => <li key={x.slug}><Link to={`${BASE}/items/${x.slug}`}>{x.name}</Link></li>)}</ul></>}
      {none && <p className="ar-dim">{t('arc.no_uses')}</p>}
    </>
  );
};

export const ItemDetail = ({ item }) => {
  const { t } = useTranslation();
  return (
    <section className="ar-sec ar-detail">
      <p className="ar-crumb"><Link to={`${BASE}/items`}>← {t('arc.items_title')}</Link></p>
      <dl className="ar-facts">
        <div><dt>{t('arc.col_cat')}</dt><dd>{ITEM_CATS[item.cat]}</dd></div>
        <div><dt>{t('arc.col_rarity')}</dt><dd><Rarity r={item.rarity} /> {item.rarity}</dd></div>
        <div><dt>{t('arc.col_sell')}</dt><dd>{item.sell.toLocaleString('en-US')} {t('arc.coins')}</dd></div>
        <div><dt>{t('arc.col_stack')}</dt><dd>{item.stack}</dd></div>
        <div><dt>{t('arc.col_recycle')}</dt><dd>{item.recycle === null ? t('arc.no_recycle') : item.recycle ? <QtyList list={item.recycle} /> : '확인 필요'}</dd></div>
        {item.craft && <div><dt>{t('arc.note')}</dt><dd>{item.craft}</dd></div>}
        {item.note && <div><dt>{t('arc.diff')}</dt><dd>{item.note}</dd></div>}
      </dl>
      <h2>{t('arc.where_used')}</h2>
      <div className="ar-uses"><Uses name={item.name} /></div>
      <p className="ar-hint">{t('arc.uses_hint')}</p>
      <DbFoot ids={item.src} name={item.name} />
    </section>
  );
};

export const ArcDetail = ({ arc }) => {
  const { t } = useTranslation();
  const d = arc.detail;
  const parts = arcPartUses(arc);
  return (
    <section className="ar-sec ar-detail">
      <p className="ar-crumb"><Link to={`${BASE}/arc`}>← {t('arc.arc_title')}</Link></p>
      <dl className="ar-facts">
        <div><dt>{t('arc.col_type')}</dt><dd>{arc.type}</dd></div>
        <div><dt>{t('arc.col_threat')}</dt><dd>{arc.threat}</dd></div>
        <div><dt>{t('arc.col_armor')}</dt><dd>{arc.armor}</dd></div>
        <div><dt>{t('arc.col_since')}</dt><dd>{arc.since}</dd></div>
        {arc.text && <div><dt>{t('arc.col_desc')}</dt><dd>{arc.text}</dd></div>}
        {d && <div><dt>{t('arc.weak')}</dt><dd>{d.weak}</dd></div>}
        {d && <div><dt>{t('arc.act')}</dt><dd>{d.act}</dd></div>}
        {d && <div><dt>{t('arc.drops')}</dt><dd>{d.drops.map((n, i) => <React.Fragment key={n}>{i > 0 && ', '}<Name n={n} /></React.Fragment>)}{d.note && <small>{d.note}</small>}</dd></div>}
      </dl>
      {!d && <p className="ar-dim">{t('arc.arc_unverified')}</p>}
      {parts.part && (parts.upgrades.length > 0 || parts.turnIns.length > 0) && (
        <>
          <h2>{t('arc.part_needed', { part: parts.part })}</h2>
          <ul className="ar-uses">
            {parts.upgrades.map((x) => <li key={x.station.slug + x.level}><Link to={`${BASE}/workshop#${x.station.slug}`}>{x.station.name} {x.level}</Link> ×{x.qty}</li>)}
            {parts.turnIns.map((x) => <li key={x.slug}><Link to={`${BASE}/quests#${x.slug}`}>{x.name}</Link> ({x.giver})</li>)}
          </ul>
        </>
      )}
      <footer className="ar-foot">
        <span>{t('arc.checked', { date: d ? DB_CHECKED : CHECKED })}</span>
        <span>{t('arc.sources')}: </span>
        <DbSrc ids={d ? ['page', 'dxEnemy', 'wArc'] : ['dxEnemy']} name={arc.name} />
      </footer>
    </section>
  );
};

export const Workshop = () => {
  const { t } = useTranslation();
  return (
    <section className="ar-sec">
      <h2>{t('arc.workshop_title')}</h2>
      <nav className="ar-jump" aria-label={t('arc.workshop_title')}>
        {STATIONS.map((s) => <a key={s.slug} href={`#${s.slug}`}>{s.name}</a>)}
      </nav>
      {STATIONS.map((s) => (
        <article key={s.slug} id={s.slug} className="ar-card ar-station">
          <h3>{s.name} <span className="ar-chip">{t('arc.levels', { n: s.levels })}</span></h3>
          <p>{s.text}</p>
          {s.up.some((lv) => lv.length) && (
            <div className="ar-table-wrap">
              <table className="ar-table">
                <thead><tr><th>{t('arc.col_level')}</th><th>{t('arc.col_upgrade')}</th><th>{t('arc.col_crafts')}</th></tr></thead>
                <tbody>
                  {s.up.map((lv, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{lv.length ? <QtyList list={lv} /> : '-'}</td>
                      <td>{s.crafts[i]?.length ? s.crafts[i].map((n, k) => <React.Fragment key={n}>{k > 0 && ', '}<Name n={n} /></React.Fragment>) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!s.up.some((lv) => lv.length) && s.crafts[0] && <p>{s.crafts[0].map((n, k) => <React.Fragment key={n}>{k > 0 && ', '}<Name n={n} /></React.Fragment>)}</p>}
        </article>
      ))}
      <p className="ar-hint">{t('arc.workshop_hint')}</p>
      <DbFoot ids={['wWorkshop', 'gfinity']} />
    </section>
  );
};

export const Traders = () => {
  const { t } = useTranslation();
  return (
    <section className="ar-sec">
      <h2>{t('arc.traders_title')}</h2>
      <div className="ar-cards">
        {TRADERS.map((tr) => {
          const qs = QUESTS.filter((x) => x.giver === tr.name);
          return (
            <article key={tr.slug} id={tr.slug} className="ar-card">
              <div className="ar-card-top"><span className="ar-mono">{tr.name.slice(0, 2).toUpperCase()}</span><span className="ar-chip">{tr.role}</span></div>
              <h3>{tr.name}</h3>
              <p><b>{t('arc.sells')}</b> {tr.sells}</p>
              <p><b>{t('arc.pay')}</b> {tr.pay}</p>
              {qs.length > 0 && <p><b>{t('arc.quests_n', { n: qs.length })}</b> <Link to={`${BASE}/quests?giver=${encodeURIComponent(tr.name)}`}>{t('arc.see_quests')}</Link></p>}
              <DbSrc ids={tr.src} name={tr.name} note={tr.note} />
            </article>
          );
        })}
      </div>
      <p className="ar-hint">{t('arc.traders_hint')}</p>
      <DbFoot ids={['wTraders']} />
    </section>
  );
};

export const Quests = () => {
  const { t } = useTranslation();
  const [f, set] = useFilters(['q', 'giver', 'map']);
  const givers = useMemo(() => [...new Set(QUESTS.map((x) => x.giver))], []);
  const rows = QUESTS.filter((x) => match(`${x.name} ${[...x.turnIn, ...x.reward].map(([, n]) => n).join(' ')}`, f.q)
    && (!f.giver || x.giver === f.giver)
    && (!f.map || (f.map === 'any' ? x.maps.length === 0 : x.maps.includes(f.map))));
  return (
    <section className="ar-sec">
      <h2>{t('arc.quests_title')}</h2>
      <div className="ar-filters">
        <input type="search" value={f.q} onChange={(e) => set('q', e.target.value)} placeholder={t('arc.quest_search')} aria-label={t('arc.quest_search')} />
        <Select label={t('arc.col_giver')} value={f.giver} onChange={(v) => set('giver', v)} options={givers.map((g) => [g, g])} />
        <Select label={t('arc.col_map')} value={f.map} onChange={(v) => set('map', v)} options={[['any', t('arc.any_map')], ...Object.entries(QUEST_MAPS)]} />
      </div>
      <p className="ar-count">{t('arc.count', { n: rows.length, total: QUESTS.length })}</p>
      <ol className="ar-quests">
        {rows.map((x) => (
          <li key={x.slug} id={x.slug} className="ar-card">
            <div className="ar-card-top"><strong>{x.name}</strong><Link to={`${BASE}/traders#${slugify(x.giver)}`} className="ar-chip">{x.giver}</Link></div>
            <p><b>{t('arc.col_map')}:</b> {x.maps.length ? x.maps.map((m) => QUEST_MAPS[m]).join(', ') : t('arc.any_map')}</p>
            <p><b>{t('arc.col_turnin')}</b> {x.turnIn.length ? <QtyList list={x.turnIn} /> : t('arc.no_turnin')}</p>
            <p><b>{t('arc.col_reward')}</b> <QtyList list={x.reward} /></p>
          </li>
        ))}
      </ol>
      {rows.length === 0 && <p className="ar-empty">{t('arc.empty')}</p>}
      <p className="ar-hint">{t('arc.quests_hint')}</p>
      <DbFoot ids={['wQuests', 'dxQuests', 'shack']} />
    </section>
  );
};
