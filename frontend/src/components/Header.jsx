import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = () => {
  const { isLoggedIn, logout } = useAuth();

  const handleLogout = () => {
    logout();
    // Optional: Redirect to home or login page after logout
    // window.location.href = "/"; 
  };

  return (
    <header className="header">
      <div className="logo">
        <Link to="/">TN</Link>
      </div>
      <nav className="nav">
        <ul>
          <li><Link to="/join">회원가입</Link></li>
          {isLoggedIn ? (
            <li><button onClick={handleLogout} className="logout-btn">로그아웃</button></li>
          ) : (
            <li><Link to="/login">로그인</Link></li>
          )}
          <li><Link to="/user">마이페이지</Link></li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
