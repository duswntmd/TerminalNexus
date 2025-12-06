import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = () => {
  const { isLoggedIn, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="logo">
          <Link to="/">TN</Link>
        </div>
        <nav className="nav">
          <ul>
            <li><Link to="/join">회원가입</Link></li>
            {isLoggedIn ? (
              <>
                <li><Link to="/user">마이페이지</Link></li>
                <li><button onClick={handleLogout} className="logout-btn">로그아웃</button></li>
              </>
            ) : (
              <>
                <li><Link to="/guide">이용안내</Link></li>
                <li><Link to="/login">로그인</Link></li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
