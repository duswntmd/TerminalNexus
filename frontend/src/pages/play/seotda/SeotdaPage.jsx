import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LocalGame from './LocalGame.jsx';
import OnlineSeotda from './OnlineSeotda.jsx';
import '../chess/Chess.css';
import './Seotda.css';

const MODES = ['ai', 'online'];

/**
 * 섯다: 게임판은 스크롤 없이 한 화면(머리글 아래 전체)을 쓰고, 기록·족보·규칙·안내는 그 아래에 둔다.
 * 가상 포인트만 쓰는 게임이라 광고(AdSlot)를 넣지 않는다.
 */
const SeotdaPage = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const mode = MODES.includes(params.get('mode')) ? params.get('mode') : 'ai';
  const rules = t('seotda.rules', { returnObjects: true });

  const topbar = (
    <>
      <h1 className="sd-title">🎴 {t('seotda.title')}</h1>
      <div className="sd-tabs" role="tablist">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={`sd-tab${mode === m ? ' is-active' : ''}`}
            onClick={() => setParams({ mode: m })}
          >
            {t(`seotda.tabs.${m}`)}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="sd-page">
      <Helmet>
        <title>{t('seotda.meta_title')}</title>
        <meta name="description" content={t('seotda.meta_desc')} />
        <link rel="canonical" href="https://tnhub.kr/play/seotda" />
      </Helmet>

      {mode === 'online' ? <OnlineSeotda topbar={topbar} /> : <LocalGame topbar={topbar} />}

      <div className="sd-below">
        <p className="sd-notice">{t('seotda.notice')}</p>
        <details className="ch-panel ch-rules" open>
          <summary>{t('seotda.rules_title')}</summary>
          <ul>
            {Array.isArray(rules) && rules.map(([name, desc]) => <li key={name}><b>{name}</b>: {desc}</li>)}
          </ul>
        </details>
        <Link className="tn-guide-link" to="/rules/seotda-jokbo">{t('rules.link_seotda')} →</Link>
        <p className="sd-credit">
          <a href="https://commons.wikimedia.org/wiki/Category:SVG_Hwatu" target="_blank" rel="noopener noreferrer">{t('gostop.card_credit')}</a>
          {' · '}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.ko" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
        </p>
      </div>
    </div>
  );
};

export default SeotdaPage;
