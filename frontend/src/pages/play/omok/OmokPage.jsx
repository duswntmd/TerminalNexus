import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LocalGame from './LocalGame.jsx';
import OnlineOmok from './OnlineOmok.jsx';
import './Omok.css';

const MODES = ['ai', 'local', 'online'];

/**
 * 오목: 게임판은 스크롤 없이 한 화면(머리글 아래 전체)을 쓰고, 규칙 설명은 그 아래에 둔다.
 * 게임 페이지라 광고(AdSlot)를 넣지 않는다. 채택한 규칙은 RULES.md 참고.
 */
const OmokPage = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const mode = MODES.includes(params.get('mode')) ? params.get('mode') : 'ai';
  const rules = t('omok.rules', { returnObjects: true });

  const topbar = (
    <>
      <h1 className="om-title"><span className="om-logo" aria-hidden="true"><i /><i /></span>{t('omok.title')}</h1>
      <div className="om-tabs" role="tablist">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={`om-tab${mode === m ? ' is-active' : ''}`}
            onClick={() => setParams({ mode: m })}
          >
            {t(`omok.modes.${m}`)}
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="om-page">
      <Helmet>
        <title>{t('omok.meta_title')}</title>
        <meta name="description" content={t('omok.meta_desc')} />
        <link rel="canonical" href="https://tnhub.kr/play/omok" />
      </Helmet>

      {mode === 'online' ? <OnlineOmok topbar={topbar} /> : <LocalGame mode={mode} topbar={topbar} />}

      <div className="om-below">
        <details className="om-panel om-rules" open>
          <summary>{t('omok.rules_title')}</summary>
          <ul>
            {Array.isArray(rules) && rules.map(([name, desc]) => <li key={name}><b>{name}</b>: {desc}</li>)}
          </ul>
        </details>
      </div>
    </div>
  );
};

export default OmokPage;
