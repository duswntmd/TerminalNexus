import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import './Header.css';

const Header = () => {
  const { isLoggedIn, logout } = useAuth();
  const { t, i18n } = useTranslation();

  const handleLogout = () => {
    logout();
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/">TN</Link>
        </div>
        <nav className="nav">
          <ul>
            {isLoggedIn ? (
              <>
                <li><button onClick={handleLogout} className="logout-btn">{t('header.logout')}</button></li>
                <li><Link to="/user">{t('header.mypage')}</Link></li>
              </>
            ) : (
              <>
                <li><Link to="/login">{t('header.login')}</Link></li>
                <li><Link to="/guide">{t('header.guide')}</Link></li>
              </>
            )}
            <li><Link to="/join">{t('header.signup')}</Link></li>
            <li>
                <div className="lang-switcher">
                    <button onClick={() => changeLanguage('ko')} className={i18n.language === 'ko' ? 'active' : ''}>KO</button>
                    <span>|</span>
                    <button onClick={() => changeLanguage('en')} className={i18n.language === 'en' ? 'active' : ''}>EN</button>
                </div>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
