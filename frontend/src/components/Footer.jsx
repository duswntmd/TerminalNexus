import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* 좌측: 로고 및 타이틀 */}
        <div className="footer-left">
          <img src="/favicon-192.png" alt="TerminalNexus Logo" className="footer-logo" />
          <span className="footer-title">TerminalNexus</span>
        </div>

        {/* 우측: 제작자 정보 및 이메일 */}
        <div className="footer-right">
          <div className="footer-info">
            <span className="info-item"><strong>이름(이니셜):</strong> JS</span>
            <span className="info-divider">|</span>
            <span className="info-item"><strong>닉네임:</strong> 에고수</span>
          </div>
          <div className="footer-emails">
            <span className="email-item">📧 efvihv@gmail.com</span>
            <span className="email-item">📧 wnend1010@naver.com</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
