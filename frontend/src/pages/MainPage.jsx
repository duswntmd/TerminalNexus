import React from 'react';
import { Link } from 'react-router-dom';
import Carousel from '../components/Carousel';
import './MainPage.css';

const MainPage = () => {
  const carouselItems = [
    {
      title: "TN에 오신 것을 환영합니다",
      description: "터미널 관리의 미래가 여기에 있습니다.",
      // image: "https://via.placeholder.com/1200x400?text=Slide+1" // Example image
    },
    {
      title: "보안 및 속도",
      description: "엔터프라이즈급 보안과 놀라운 성능을 경험하세요.",
      // image: "https://via.placeholder.com/1200x400?text=Slide+2"
    },
    {
      title: "협업",
      description: "팀원들과 실시간으로 협업하세요.",
      // image: "https://via.placeholder.com/1200x400?text=Slide+3"
    }
  ];

  return (
    <div className="main-page">
      <Carousel items={carouselItems} />
      
      <section className="hero">
        <div className="hero-content">
          <h1><span className="highlight">TN</span>에 오신 것을 환영합니다</h1>
          <p className="subtitle">고급 터미널 관리를 위한 당신의 관문</p>
          <p className="description">
            커맨드 라인의 강력함을 현대적인 웹 시각화로 연결하고, 관리하고, 배포하세요.
          </p>
          <div className="cta-buttons">
            <Link to="/join" className="btn btn-primary">시작하기</Link>
            <Link to="/login" className="btn btn-secondary">로그인</Link>
          </div>
        </div>
      </section>
      
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
