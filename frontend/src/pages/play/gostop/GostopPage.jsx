import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HwatuCard from '../../../components/hwatu/HwatuCard.jsx';
import AiGame from './AiGame.jsx';
import OnlineGostop from './OnlineGostop.jsx';
import './Gostop.css';

const MODES = ['ai', 'online'];
// 규칙 설명 옆 카드 예시: 광, 비광, 고도리 새, 열끗, 홍단, 청단, 초단, 비띠, 피, 쌍피, 국진
const LEGEND = [0, 44, 4, 16, 1, 21, 13, 46, 2, 41, 32];

/** 화투 고스톱 맞고 (AI 대전 / 온라인). 광고(AdSlot)는 넣지 않는다 */
const GostopPage = () => {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const mode = MODES.includes(params.get('mode')) ? params.get('mode') : 'ai';
  const rules = t('gostop.rules', { returnObjects: true });

  return (
    <div className="gs-page">
      <Helmet>
        <title>{t('gostop.meta_title')}</title>
        <meta name="description" content={t('gostop.meta_desc')} />
        <link rel="canonical" href="https://tnhub.kr/play/gostop" />
      </Helmet>

      <div className="gs-container">
        <div className="gs-header">
          <h1 className="gs-title">🎴 {t('gostop.title')}</h1>
          <div className="gs-tabs" role="tablist">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className={`gs-tab${mode === m ? ' is-active' : ''}`}
                onClick={() => setParams({ mode: m })}
              >
                {t(`gostop.modes.${m}`)}
              </button>
            ))}
          </div>
        </div>
        <p className="gs-notice">{t('gostop.virtual_notice')}</p>

        {mode === 'online' ? <OnlineGostop /> : <AiGame />}

        <details className="gs-panel gs-rules">
          <summary>{t('gostop.rules_title')}</summary>
          <div className="gs-legend" aria-hidden="true">
            {LEGEND.map((id) => <HwatuCard key={id} id={id} />)}
          </div>
          {Array.isArray(rules) && rules.map((sec) => (
            <section key={sec.h}>
              <h3>{sec.h}</h3>
              <ul>
                {sec.items.map(([name, desc]) => <li key={name}><b>{name}</b>: {desc}</li>)}
              </ul>
            </section>
          ))}
        </details>
      </div>
    </div>
  );
};

export default GostopPage;
