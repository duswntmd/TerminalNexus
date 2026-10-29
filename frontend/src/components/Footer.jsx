import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NAV_GROUPS } from '../nav';
import './Footer.css';

const Footer = () => {
  const { t } = useTranslation();
  return (
    <footer className="ft">
      <div className="ft-inner">
        <div className="ft-brand">
          <Link to="/" className="ft-logo-row">
            <img src="/favicon-192.png" alt="" className="ft-logo" />
            <span className="ft-word">TerminalNexus</span>
          </Link>
          <p className="ft-desc">{t('footer.desc')}</p>
          <p className="ft-host"><span className="tn-led" aria-hidden="true" />{t('footer.host')}</p>
        </div>

        <nav className="ft-map" aria-label={t('footer.sitemap')}>
          {NAV_GROUPS.map((g) => (
            <div key={g.key} className="ft-col">
              <h2>{t(`nav.groups.${g.key}`)}</h2>
              <ul>
                {g.items.map((it) => <li key={it.key}><Link to={it.path}>{t(`nav.${it.key}.name`)}</Link></li>)}
              </ul>
            </div>
          ))}
          <div className="ft-col">
            <h2>{t('footer.site')}</h2>
            <ul>
              <li><Link to="/guide">{t('nav.guide')}</Link></li>
              <li><Link to="/donation">{t('nav.donation')}</Link></li>
              <li><Link to="/terms">{t('footer.terms')}</Link></li>
              <li><Link to="/privacy" className="ft-strong">{t('footer.privacy')}</Link></li>
            </ul>
          </div>
        </nav>
      </div>
      <div className="ft-bottom">
        <span>{t('footer.operator')} JS ({t('footer.nickname')} 에고수)</span>
        <span className="ft-mail">
          <a href="mailto:efvihv@gmail.com">efvihv@gmail.com</a>
          <a href="mailto:wnend1010@naver.com">wnend1010@naver.com</a>
        </span>
      </div>
    </footer>
  );
};

export default Footer;
