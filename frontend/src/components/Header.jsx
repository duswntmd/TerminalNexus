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
            {/* 공통 메뉴: 이용안내 - 항상 표시 */}
            <li><Link to="/guide">{t('header.guide')}</Link></li>
            <li><Link to="/fruit-ai">🍎 과일 AI</Link></li>
            
            {/* 조건부 메뉴: 로그인 상태에 따라 다르게 표시 */}
            {isLoggedIn ? (
              <>
                <li><Link to="/user">{t('header.mypage')}</Link></li>
                <li><button onClick={handleLogout} className="logout-btn">{t('header.logout')}</button></li>
                {isAdmin && (
                  <li><Link to="/admin/users" className="admin-link">👑 {t('header.admin_users')}</Link></li>
                )}
              </>
            ) : (
              <>
                <li><Link to="/join">{t('header.signup')}</Link></li>
                <li><Link to="/login">{t('header.login')}</Link></li>
              </>
            )}
            
            {/* 공통 메뉴: 채팅, 자유게시판 - 항상 표시 */}
            <li><Link to="/chat">💬 채팅</Link></li>
            <li><Link to="/freeboard">{t('header.freeboard')}</Link></li>
            
            {/* 언어 전환 */}
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
