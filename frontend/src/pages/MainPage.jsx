import React from 'react';
import { Link } from 'react-router-dom';
import heroBg from '../assets/hero-bg.png';
import './MainPage.css';

const MainPage = () => {
  return (
    <div className="main-page">
      <div className="hero-wrapper">
        <img src={heroBg} alt="Hero Background" className="hero-bg-image" />
        <section className="hero">
          <div className="hero-content">
            <h1><span className="highlight">TN</span>과 함께하는<br/>더 나은 터미널 관리</h1>
            <p className="subtitle">현대적인 웹 환경에서 경험하는 강력한 터미널</p>
            <p className="description">
              복잡한 인프라 관리를 단순하게. 보안과 효율성을 동시에 잡으세요.
            </p>
            <div className="cta-buttons">
              <Link to="/join" className="btn btn-primary">무료로 시작하기</Link>
              <Link to="/login" className="btn btn-secondary">로그인</Link>
            </div>
          </div>
        </section>
      </div>
      
      <section className="features">
        <div className="feature-card">
          <h3>안전한 접근</h3>
          <p>터미널 세션을 위한 엔터프라이즈급 보안을 제공합니다.</p>
        </div>
        <div className="feature-card">
          <h3>실시간 동기화</h3>
          <p>팀원들과 실시간으로 협업할 수 있습니다.</p>
        </div>
        <div className="feature-card">
          <h3>클라우드 네이티브</h3>
          <p>클라우드를 위해 구축되어 어디서나 접근 가능합니다.</p>
        </div>
        <div className="feature-card">
          <h3>분석</h3>
          <p>사용량과 성능에 대한 깊이 있는 통찰력을 제공합니다.</p>
        </div>
      </section>

      <section className="info-section">
        <h2>왜 TN인가요?</h2>
        <p>
          TN은 인프라와 개발 워크플로우 사이의 매끄러운 인터페이스를 제공합니다.
          현대적인 웹 애플리케이션의 편리함과 터미널의 강력함을 동시에 경험해보세요.
        </p>
      </section>
    </div>
  );
};

export default MainPage;
