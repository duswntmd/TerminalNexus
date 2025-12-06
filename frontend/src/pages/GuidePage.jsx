import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import './MainPage.css'; // Reusing general styles

const GuidePage = () => {
    const { t } = useTranslation();

    return (
        <div className="main-page" style={{ justifyContent: 'flex-start', paddingTop: '4rem' }}>
            <div className="info-section" style={{ marginTop: 0 }}>
                <h2>{t('guide.title')}</h2>
                <p>
                    {t('guide.welcome')}
                    <br/><br/>
                    <Trans i18nKey="guide.step_1">
                        1. <strong>회원가입</strong>: 상단 메뉴의 '회원가입'을 통해 계정을 생성하세요.
                    </Trans>
                    <br/>
                    <Trans i18nKey="guide.step_2">
                        2. <strong>로그인</strong>: 생성한 계정으로 로그인하여 서비스를 이용하세요.
                    </Trans>
                    <br/>
                    <Trans i18nKey="guide.step_3">
                        3. <strong>터미널 관리</strong>: 로그인 후 대시보드에서 터미널을 관리할 수 있습니다.
                    </Trans>
                    <br/>
                    <Trans i18nKey="guide.step_4">
                        4. <strong>마이페이지</strong>: 개인 정보 수정 및 회원 탈퇴는 마이페이지에서 가능합니다.
                    </Trans>
                </p>
                <div style={{ marginTop: '2rem' }}>
                    <p style={{ fontSize: '0.9rem', color: '#999' }}>{t('guide.contact')}</p>
                </div>
            </div>
        </div>
    );
};

export default GuidePage;
