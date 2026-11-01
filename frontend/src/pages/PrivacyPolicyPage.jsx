import React from 'react';
import { Container, Typography, Box, Paper, Divider } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

const KO_CONTENT = (
  <>
    <Typography variant="h4" component="h1" fontWeight={800} color="#00ff66" gutterBottom sx={{ letterSpacing: '-1px' }}>
      🔒 개인정보처리방침
    </Typography>
    <Typography variant="body2" color="var(--tn-text-2)" sx={{ mb: 4 }}>
      본 방침은 2026년 11월 1일부터 시행됩니다.
    </Typography>
    <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 4 }} />
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5 }}>
      1. 수집하는 개인정보의 항목 및 수집 방법
    </Typography>
    <Typography variant="body2" color="var(--tn-text-2)" paragraph sx={{ lineHeight: 1.8 }}>
      당사는 회원가입, 원활한 기술 지원 및 서비스 제공을 위해 아래와 같은 최소한의 개인정보를 수집하고 있습니다.<br />
      - <strong>필수 항목:</strong> 이메일 주소, 로그인 아이디, 비밀번호(BCrypt 암호화), 닉네임<br />
      - <strong>소셜 로그인 연동 시:</strong> 소셜 서비스 제공업체(구글, 네이버 등)로부터 전달받은 사용자 식별 식별자(ID) 및 닉네임, 프로필 이미지 URL<br />
      - <strong>자동 수집 항목:</strong> 서비스 이용 기록, 접속 로그, 쿠키(Cookie), 접속 IP 정보, 브라우저 환경 정보
    </Typography>
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5, mt: 4 }}>
      2. 개인정보의 수집 및 이용 목적
    </Typography>
    <Typography variant="body2" color="var(--tn-text-2)" paragraph sx={{ lineHeight: 1.8 }}>
      수집한 개인정보를 다음의 목적을 위해 활용합니다.<br />
      - <strong>회원 관리:</strong> 개인 식별, 비인가 사용 방지, 가입 의사 확인, 연령 확인 및 부정 이용 방지<br />
      - <strong>서비스 제공 및 정산:</strong> 독립적인 격리 원격 가상 터미널 환경 제공, API 호출 제어, 후원(기부) 결제 내역 확인 및 세션 복구<br />
      - <strong>고객 기술 지원:</strong> 서비스 이용 중 발생한 버그 제보 처리, 시스템 장애 문의 대처 및 중요 고지사항 전달
    </Typography>
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5, mt: 4 }}>
      3. 개인정보의 보유 및 이용 기간
    </Typography>
    <Typography variant="body2" color="var(--tn-text-2)" paragraph sx={{ lineHeight: 1.8 }}>
      이용자의 개인정보는 원칙적으로 개인정보의 수집 및 이용목적이 달성되면 지체 없이 파기합니다. 단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 다음과 같이 관계법령에서 정한 일정 기간 회원정보를 보관합니다.<br />
      - <strong>회원 탈퇴 시:</strong> 즉시 파기 처리 (단, 악의적 가입/탈퇴 반복을 방지하기 위해 7일간 탈퇴 정보 유예 보관 가능)<br />
      - <strong>전자상거래 등에서의 소비자보호에 관한 법률:</strong> 계약 또는 청약철회 등에 관한 기록(5년)
    </Typography>
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5, mt: 4 }}>
      4. 광고 및 쿠키
    </Typography>
    <Typography variant="body2" color="var(--tn-text-2)" paragraph sx={{ lineHeight: 1.8 }}>
      이 사이트는 Google AdSense 광고를 게재할 수 있습니다.<br />
      - Google을 포함한 제3자 공급업체는 쿠키를 사용해 사용자의 이전 방문 기록을 바탕으로 광고를 게재합니다.<br />
      - 사용자는 <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google 광고 설정</a>에서 맞춤 광고를 끌 수 있습니다.<br />
      - 자세한 내용은 <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">Google 광고 정책</a>을 참고하세요.<br />
      - 브라우저 설정에서 쿠키를 거부할 수 있으며, 일부 기능이 제한될 수 있습니다.
    </Typography>
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5, mt: 4 }}>
      5. 개인정보 보호책임자 및 기술 문의 연락처
    </Typography>
    <Typography variant="body2" color="var(--tn-text-2)" paragraph sx={{ lineHeight: 1.8 }}>
      개인정보 보호 관련 문의 사항 및 관련 불편 사항은 아래의 연락처로 이메일을 접수해 주시면 평일 기준 24시간 내에 응답해 드리겠습니다.<br />
      - <strong>개인정보 책임 이메일:</strong> efvihv@gmail.com / wnend1010@naver.com
    </Typography>
  </>
);

const EN_CONTENT = (
  <>
    <Typography variant="h4" component="h1" fontWeight={800} color="#00ff66" gutterBottom sx={{ letterSpacing: '-1px' }}>
      🔒 Privacy Policy
    </Typography>
    <Typography variant="body2" color="var(--tn-text-2)" sx={{ mb: 4 }}>
      Effective date: November 1, 2026
    </Typography>
    <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 4 }} />
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5 }}>
      1. Collected Items and Collection Method
    </Typography>
    <Typography variant="body2" color="var(--tn-text-2)" paragraph sx={{ lineHeight: 1.8 }}>
      We collect the minimum personal information required to sign up, provide stable technical support, and operate the service.<br />
      - <strong>Required:</strong> Email address, Login ID, Password (BCrypt encrypted), Nickname<br />
      - <strong>Social Logins:</strong> User identifier (ID), Nickname, and Profile Image URL provided by OAuth2 services (Google, Naver)<br />
      - <strong>Automatically Collected:</strong> Service usage history, access logs, cookies, IP address, browser configuration details
    </Typography>
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5, mt: 4 }}>
      2. Purpose of Collection and Use
    </Typography>
    <Typography variant="body2" color="var(--tn-text-2)" paragraph sx={{ lineHeight: 1.8 }}>
      We process personal information for the following purposes:<br />
      - <strong>Member Management:</strong> User identification, prevention of unauthorized use, confirmation of sign-up intent, age validation<br />
      - <strong>Service Provision:</strong> Supplying isolated remote virtual terminal sandboxes, API request limits, processing donation/support details<br />
      - <strong>Customer Support:</strong> Resolving bug reports, dealing with system outages, and conveying essential announcements
    </Typography>
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5, mt: 4 }}>
      3. Retention and Deletion Period
    </Typography>
    <Typography variant="body2" color="var(--tn-text-2)" paragraph sx={{ lineHeight: 1.8 }}>
      In principle, the company destroys personal information without delay once the purpose of collection and use is achieved.<br />
      - <strong>Upon Account Withdrawal:</strong> Instantly deleted (except for a 7-day safety period to prevent abuse)<br />
      - <strong>Statutory Requirements:</strong> Electronic Commerce Consumer Protection Act holds records for 5 years
    </Typography>
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5, mt: 4 }}>
      4. Advertising and Cookies
    </Typography>
    <Typography variant="body2" color="var(--tn-text-2)" paragraph sx={{ lineHeight: 1.8 }}>
      This site may display Google AdSense ads.<br />
      - Third-party vendors, including Google, use cookies to serve ads based on your prior visits.<br />
      - You can opt out of personalized ads in <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">Google Ads Settings</a>.<br />
      - See <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">how Google uses advertising data</a> for details.<br />
      - You can refuse cookies in your browser, though some features may be limited.
    </Typography>
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5, mt: 4 }}>
      5. Protection Contact
    </Typography>
    <Typography variant="body2" color="var(--tn-text-2)" paragraph sx={{ lineHeight: 1.8 }}>
      If you have inquiries regarding privacy practices, please contact us at:<br />
      - <strong>Email Support:</strong> efvihv@gmail.com / wnend1010@naver.com
    </Typography>
  </>
);

const PrivacyPolicyPage = () => {
  const { i18n } = useTranslation();
  const isKo = i18n.language === 'ko';

  return (
    <>
      <Helmet>
        <title>{isKo ? "개인정보처리방침 - TerminalNexus" : "Privacy Policy - TerminalNexus"}</title>
        <meta name="description" content={isKo ? "TerminalNexus의 개인정보처리방침입니다." : "Privacy Policy guidelines for TerminalNexus."} />
      </Helmet>
      
      <Box sx={{ minHeight: '100vh', bgcolor: 'var(--tn-bg)', color: '#fff', py: 10 }}>
        <Container maxWidth="md">
          <Paper 
            elevation={0} 
            sx={{ 
              p: { xs: 3, md: 6 }, 
              bgcolor: 'rgba(10, 10, 18, 0.75)', 
              border: '1px solid rgba(0, 255, 102, 0.2)',
              borderRadius: '20px',
              color: '#f4f4f5'
            }}
          >
            {isKo ? KO_CONTENT : EN_CONTENT}
          </Paper>
        </Container>
      </Box>
    </>
  );
};

export default PrivacyPolicyPage;
