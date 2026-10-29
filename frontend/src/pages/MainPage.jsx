import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import TerminalHero from '../components/TerminalHero';
import HomeRack from './home/HomeRack';
import { LottoPanel, PostsPanel, StockPanel } from './home/LivePanels';
import WeatherPanel from './home/WeatherPanel';
import './home/MainPage.css';

const CHIPS = ['ls', 'rocky', '/linux', '/play/typeracer'];

const MainPage = () => {
  const { t } = useTranslation();
  const { isLoggedIn } = useAuth();
  const termRef = useRef(null);

  return (
    <div className="hm">
      <Helmet>
        <title>{t('main.meta_title')}</title>
        <meta name="description" content={t('main.meta_desc')} />
      </Helmet>

      <section className="hm-hero">
        <div className="hm-wrap hm-hero-grid">
          <div className="hm-copy">
            <h1>
              <span>{t('home.title_1')}</span>
              <span>{t('home.title_2')}</span>
            </h1>
            <p className="hm-lead">
              {t('home.lead')} <span className="hm-try hm-try-d">{t('home.lead_try')}</span>
              <span className="hm-try hm-try-m">{t('home.lead_try_m')}</span>
            </p>
            <div className="hm-actions">
              {isLoggedIn
                ? <Link to="/freeboard" className="tn-btn tn-btn-primary hm-cta">{t('home.cta_board')}</Link>
                : <Link to="/join" className="tn-btn tn-btn-primary hm-cta">{t('home.cta_join')}</Link>}
              <a href="#features" className="tn-btn tn-btn-ghost hm-cta">{t('home.cta_explore')}</a>
            </div>
            {!isLoggedIn && <p className="hm-note">{t('home.note')}</p>}
          </div>

          <div className="hm-console">
            <TerminalHero ref={termRef} className="hm-term" />
            <div className="hm-chips" aria-label={t('home.chips')}>
              <span>{t('home.chips')}</span>
              {CHIPS.map((c) => (
                <button key={c} type="button" onClick={() => termRef.current?.run(c)}><code>{c}</code></button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <HomeRack />

      <section className="hm-live" aria-labelledby="hm-live-title">
        <div className="hm-wrap">
          <header className="hm-sec-head">
            <h2 id="hm-live-title">{t('home.live_title')}</h2>
          </header>
          <div className="hm-live-grid">
            <PostsPanel />
            <StockPanel />
            <LottoPanel />
          </div>
          <WeatherPanel />
        </div>
      </section>
    </div>
  );
};

export default MainPage;
