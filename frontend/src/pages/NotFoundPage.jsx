import { useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import './NotFoundPage.css';

const GLITCH_CHARS = '!@#$%^&*?/\\<>[]{}|~0123456789ABCDEF';
const glitch = (str) =>
  str.split('').map((c) =>
    Math.random() < 0.15
      ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
      : c
  ).join('');

const NotFoundPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [displayText, setDisplayText] = useState('404');
  const [scanY, setScanY] = useState(0);

  // 글리치 숫자 애니메이션
  useEffect(() => {
    let count = 0;
    const id = setInterval(() => {
      if (count < 18) {
        setDisplayText(glitch('404'));
        count++;
      } else {
        setDisplayText('404');
        clearInterval(id);
      }
    }, 60);
    return () => clearInterval(id);
  }, []);

  // 스캔라인 애니메이션
  useEffect(() => {
    const id = setInterval(() => {
      setScanY((y) => (y + 1) % 100);
    }, 20);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Helmet>
        <title>404 — 페이지를 찾을 수 없음 | TerminalNexus</title>
      </Helmet>

      <div className="nf-root">
        {/* 배경 그리드 */}
        <div className="nf-grid" />
        {/* 스캔라인 */}
        <div className="nf-scanline" style={{ top: `${scanY}%` }} />

        <div className="nf-container">
          {/* 메인 404 텍스트 */}
          <div className="nf-code" aria-label="404">
            <span className="nf-glitch" data-text={displayText}>{displayText}</span>
          </div>

          {/* 터미널 스타일 메시지 */}
          <div className="nf-terminal">
            <div className="nf-terminal-header">
              <span className="nf-dot nf-dot-red" />
              <span className="nf-dot nf-dot-yellow" />
              <span className="nf-dot nf-dot-green" />
              <span className="nf-terminal-title">terminal — error</span>
            </div>
            <div className="nf-terminal-body">
              <p><span className="nf-prompt">$</span> <span className="nf-cmd">navigate</span> <span className="nf-arg">"{location.pathname}"</span></p>
              <p className="nf-error">Error: No static resource found at this path.</p>
              <p className="nf-hint">{'>'} 요청한 페이지가 존재하지 않거나 이동되었습니다.</p>
              <p className="nf-blink">_</p>
            </div>
          </div>

          {/* 버튼 그룹 */}
          <div className="nf-actions">
            <button className="nf-btn nf-btn-primary" onClick={() => navigate('/')}>
              <span className="nf-btn-icon">⌂</span> 홈으로 돌아가기
            </button>
            <button className="nf-btn nf-btn-secondary" onClick={() => navigate(-1)}>
              <span className="nf-btn-icon">←</span> 이전 페이지
            </button>
          </div>

          {/* 빠른 링크 */}
          <div className="nf-links">
            <span className="nf-links-label">빠른 이동:</span>
            {[
              { path: '/chat', label: '💬 채팅' },
              { path: '/forge', label: '⚒️ FORGE' },
              { path: '/freeboard', label: '📋 게시판' },
            ].map(({ path, label }) => (
              <button key={path} className="nf-quick-link" onClick={() => navigate(path)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage;
