import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LocalGame from './LocalGame.jsx';
import OnlineSeotda from './OnlineSeotda.jsx';
import '../chess/Chess.css';
import './Seotda.css';

const MODES = ['ai', 'online'];

/** 섯다: 가상 포인트만 쓰는 게임이라 광고(AdSlot)를 넣지 않는다 */
const SeotdaPage = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const mode = MODES.includes(params.get('mode')) ? params.get('mode') : 'ai';
  const rules = t('seotda.rules', { returnObjects: true });

  return (
    <div className="ch-page sd-page">
      <Helmet>
        <title>{t('seotda.meta_title')}</title>
        <meta name="description" content={t('seotda.meta_desc')} />
        <link rel="canonical" href="https://tnhub.kr/play/seotda" />
      </Helmet>

      <div className="ch-container">
        <div className="ch-header">
          <h1 className="ch-title">🎴 {t('seotda.title')}</h1>
          <div className="ch-tabs" role="tablist">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={`ch-tab${mode === m ? ' is-active' : ''}`}
                onClick={() => setParams({ mode: m })}
              >
                {t(`seotda.modes.${m}`)}
              </button>
            ))}
          </div>
        </div>

        <p className="sd-notice">{t('seotda.notice')}</p>

        {mode === 'online' ? <OnlineSeotda /> : <LocalGame />}

        <details className="ch-panel ch-rules">
          <summary>{t('seotda.rules_title')}</summary>
          <ul>
            {Array.isArray(rules) && rules.map(([name, desc]) => <li key={name}><b>{name}</b>: {desc}</li>)}
          </ul>
        </details>
      </div>
    </div>
  );
};

export default SeotdaPage;
