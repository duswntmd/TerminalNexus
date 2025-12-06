import React from 'react';
import './MainPage.css'; // Reusing general styles

const GuidePage = () => {
    return (
        <div className="main-page" style={{ justifyContent: 'flex-start', paddingTop: '4rem' }}>
            <div className="info-section" style={{ marginTop: 0 }}>
                <h2>이용안내</h2>
                <p>
                    TN 서비스에 오신 것을 환영합니다.
                    <br/><br/>
                    1. <strong>회원가입</strong>: 상단 메뉴의 '회원가입'을 통해 계정을 생성하세요.
                    <br/>
                    2. <strong>로그인</strong>: 생성한 계정으로 로그인하여 서비스를 이용하세요.
                    <br/>
                    3. <strong>터미널 관리</strong>: 로그인 후 대시보드에서 터미널을 관리할 수 있습니다.
                    <br/>
                    4. <strong>마이페이지</strong>: 개인 정보 수정 및 회원 탈퇴는 마이페이지에서 가능합니다.
                </p>
                <div style={{ marginTop: '2rem' }}>
                    <p style={{ fontSize: '0.9rem', color: '#999' }}>문의사항: contact@tn.pe.kr</p>
                </div>
            </div>
        </div>
    );
};

export default GuidePage;
