import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LocalGame from './LocalGame.jsx';
import OnlineChess from './OnlineChess.jsx';
import './Chess.css';

const MODES = ['ai', 'local', 'online'];

const ChessPage = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const mode = MODES.includes(params.get('mode')) ? params.get('mode') : 'ai';
  const rules = t('chess.rules', { returnObjects: true });

  return (
    <div className="ch-page">
      <Helmet>
        <title>{t('chess.meta_title')}</title>
        <meta name="description" content={t('chess.meta_desc')} />
        <link rel="canonical" href="https://tnhub.kr/play/chess" />
      </Helmet>

      <div className="ch-container">
        <div className="ch-header">
          <h1 className="ch-title">♞ {t('chess.title')}</h1>
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
                {t(`chess.modes.${m}`)}
              </button>
            ))}
          </div>
        </div>

        {mode === 'online' ? <OnlineChess /> : <LocalGame mode={mode} />}

        <details className="ch-panel ch-rules">
          <summary>{t('chess.rules_title')}</summary>
          <ul>
            {Array.isArray(rules) && rules.map(([name, desc]) => <li key={name}><b>{name}</b>: {desc}</li>)}
          </ul>
        </details>
      </div>
    </div>
  );
};

export default ChessPage;
