import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAV_GROUPS } from '../../nav';

// 1U 랙 유닛 하나 = 기능 하나
function Unit({ to, glyph, name, desc, login, index }) {
  const { t } = useTranslation();
  return (
    <Link to={to} className="unit" style={{ '--i': index }}>
      <span className="unit-ear" aria-hidden="true"><i /><i /></span>
      <span className={`tn-led ${login ? 'amber' : ''} unit-led`} aria-hidden="true" />
      <span className="unit-glyph" aria-hidden="true">{glyph}</span>
      <span className="unit-text">
        <span className="unit-name">{name}</span>
        <span className="unit-desc">{desc}</span>
      </span>
      <span className="unit-meta">
        <code className="unit-path">{to}</code>
        <span className={`unit-access ${login ? 'login' : ''}`}>{login ? t('nav.login_needed') : t('nav.open')}</span>
      </span>
      <svg className="unit-arrow" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
      <span className="unit-ear right" aria-hidden="true"><i /><i /></span>
    </Link>
  );
}

function Rack({ sections, start }) {
  const { t } = useTranslation();
  let n = start;
  return (
    <div className="rack">
      {sections.map((s) => (
        <div key={s.key} className="rack-group">
          <span className="tn-tape rack-tape">{s.label}</span>
          {s.items.map((it) => (
            <Unit
              key={it.key}
              to={it.path}
              glyph={it.glyph}
              name={it.name ?? t(`nav.${it.key}.name`)}
              desc={it.desc ?? t(`nav.${it.key}.desc`)}
              login={it.login}
              index={n++}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

const HomeRack = () => {
  const { t } = useTranslation();
  const g = (k) => NAV_GROUPS.find((x) => x.key === k);
  const play = [{ key: 'play', label: t('nav.groups.play'), items: g('play').items }];
  const side = [
    { key: 'community', label: t('nav.groups.community'), items: g('community').items },
    { key: 'tools', label: t('nav.groups.tools'), items: g('tools').items },
    {
      key: 'site', label: t('home.rack_extra'), items: [
        { key: 'guide', path: '/guide', glyph: 'i', name: t('nav.guide'), desc: t('home.guide_desc') },
        { key: 'donation', path: '/donation', glyph: '♥', name: t('nav.donation'), desc: t('home.donation_desc') },
      ],
    },
  ];
  return (
    <section className="hm-rack" id="features" aria-labelledby="hm-rack-title">
      <div className="hm-wrap">
        <header className="hm-sec-head">
          <h2 id="hm-rack-title">{t('home.rack_title')}</h2>
          <p>{t('home.rack_sub')}</p>
        </header>
        <div className="racks">
          <Rack sections={play} start={0} />
          <Rack sections={side} start={7} />
        </div>
      </div>
    </section>
  );
};

export default HomeRack;
