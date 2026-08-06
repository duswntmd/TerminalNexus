import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import './Header.css';

const BACKEND_API_BASE_URL = ''; // Vite 프록시 사용


const Header = () => {
  const { isLoggedIn, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // 모바일 메뉴 토글 상태
  const [activeDropdown, setActiveDropdown] = useState(null); // 모바일용: 현재 열려있는 카테고리 ('about', 'community', 'play')

  // 사용자 정보 가져오기
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!isLoggedIn) {
        setIsAdmin(false);
        return;
      }

      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch(`${BACKEND_API_BASE_URL}/api/user`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
        });

        if (res.ok) {
          const data = await res.json();
          // 관리자 권한 확인 (백엔드에서 roleType 필드 추가 필요)
          setIsAdmin(data.roleType === 'ADMIN');
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        setIsAdmin(false);
      }
    };

    checkAdminRole();
  }, [isLoggedIn]);

  const handleLogout = () => {
    logout();
    setIsAdmin(false);
    closeMenu();
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    closeMenu();
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setActiveDropdown(null);
  };

  const toggleDropdown = (category) => {
    if (activeDropdown === category) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(category);
    }
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/" onClick={closeMenu}>
            <img src="/favicon-192.png" alt="TerminalNexus Logo" className="logo-img" />
          </Link>
        </div>

        {/* 모바일 햄버거 토글 버튼 */}
        <button
          className={`menu-toggle-btn ${isMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle navigation"
        >
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
          <span className="hamburger-bar"></span>
        </button>

        <nav className={`nav ${isMenuOpen ? 'open' : ''}`}>
          {/* GNB 메인 메뉴 (카테고리 그룹화) */}
          <ul className="nav-menu">
            {/* 1. 소개 카테고리 */}
            <li className={`nav-item dropdown ${activeDropdown === 'about' ? 'active' : ''}`}>
              <button 
                className="dropdown-toggle" 
                onClick={() => toggleDropdown('about')}
                type="button"
              >
                {t('header.about')} <span className="arrow"></span>
              </button>
              <ul className="dropdown-menu">
                <li><Link to="/guide" onClick={closeMenu}>{t('header.guide')}</Link></li>
                <li><Link to="/fruit-ai" onClick={closeMenu}>🍎 과일 AI</Link></li>
              </ul>
            </li>

            {/* 2. 커뮤니티 카테고리 */}
            <li className={`nav-item dropdown ${activeDropdown === 'community' ? 'active' : ''}`}>
              <button 
                className="dropdown-toggle" 
                onClick={() => toggleDropdown('community')}
                type="button"
              >
                {t('header.community')} <span className="arrow"></span>
              </button>
              <ul className="dropdown-menu">
                <li><Link to="/chat" onClick={closeMenu}>💬 채팅</Link></li>
                <li><Link to="/freeboard" onClick={closeMenu}>{t('header.freeboard')}</Link></li>
              </ul>
            </li>

            {/* 3. 게임/체험 카테고리 */}
            <li className={`nav-item dropdown ${activeDropdown === 'play' ? 'active' : ''}`}>
              <button 
                className="dropdown-toggle" 
                onClick={() => toggleDropdown('play')}
                type="button"
              >
                {t('header.play')} <span className="arrow"></span>
              </button>
              <ul className="dropdown-menu">
                <li><Link to="/play/stock" onClick={closeMenu}>📈 주식</Link></li>
                <li><Link to="/forge" onClick={closeMenu}>⚒️ 강화</Link></li>
                <li><Link to="/play/typeracer" onClick={closeMenu}>{t('header.typeracer')}</Link></li>
                <li><Link to="/play/hackermode" onClick={closeMenu}>{t('header.hackermode')}</Link></li>
                <li><Link to="/play/terminalhack" onClick={closeMenu}>{t('header.terminalhack')}</Link></li>
              </ul>
            </li>
          </ul>

          {/* 우측 계정 및 설정 영역 */}
          <div className="header-right">
            <ul className="auth-menu">
              {isLoggedIn ? (
                <>
                  {isAdmin && (
                    <li><Link to="/admin/users" onClick={closeMenu} className="admin-link">👑 {t('header.admin_users')}</Link></li>
                  )}
                  <li><Link to="/user" onClick={closeMenu} className="mypage-link">{t('header.mypage')}</Link></li>
                  <li><button onClick={handleLogout} className="logout-btn">{t('header.logout')}</button></li>
                </>
              ) : (
                <>
                  <li><Link to="/login" onClick={closeMenu} className="login-link">{t('header.login')}</Link></li>
                  <li><Link to="/join" onClick={closeMenu} className="signup-link">{t('header.signup')}</Link></li>
                </>
              )}
            </ul>

            {/* 언어 전환 */}
            <div className="lang-switcher">
              <button onClick={() => changeLanguage('ko')} className={i18n.language === 'ko' ? 'active' : ''}>KO</button>
              <span>|</span>
              <button onClick={() => changeLanguage('en')} className={i18n.language === 'en' ? 'active' : ''}>EN</button>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
