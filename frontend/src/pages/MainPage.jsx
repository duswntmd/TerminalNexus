import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import TerminalHero from '../components/TerminalHero';
import './MainPage.css';

const MainPage = () => {
  const { t } = useTranslation();

  return (
    <div className="main-page">
      {/* Interactive Terminal Hero */}
      <TerminalHero />
      
      <div className="content-wrapper">
        <section className="features">
            <div className="feature-card">
              <h3>{t('main.feature_1_title')}</h3>
              <p>{t('main.feature_1_desc')}</p>
            </div>
            <div className="feature-card">
              <h3>{t('main.feature_2_title')}</h3>
              <p>{t('main.feature_2_desc')}</p>
            </div>
            <div className="feature-card">
              <h3>{t('main.feature_3_title')}</h3>
              <p>{t('main.feature_3_desc')}</p>
            </div>
        </section>

        <section className="info-section">
            <h2>{t('main.why_tn_title')}</h2>
            <p>
              {t('main.why_tn_desc')}
            </p>
        </section>
      </div>
    </div>
  );
};

export default MainPage;
