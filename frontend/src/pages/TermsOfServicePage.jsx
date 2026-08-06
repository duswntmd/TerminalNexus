import React from 'react';
import { Container, Typography, Box, Paper, Divider } from '@mui/material';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

const KO_CONTENT = (
  <>
    <Typography variant="h4" component="h1" fontWeight={800} color="#00ff66" gutterBottom sx={{ letterSpacing: '-1px' }}>
      📜 서비스 이용약관
    </Typography>
    <Typography variant="body2" color="#8892b0" sx={{ mb: 4 }}>
      본 약관은 2026년 7월 2일부터 시행됩니다.
    </Typography>
    <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 4 }} />
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5 }}>
      제 1 조 (목적)
    </Typography>
    <Typography variant="body2" color="#8892b0" paragraph sx={{ lineHeight: 1.8 }}>
      본 약관은 TerminalNexus 운영팀(이하 "운영팀")이 제공하는 웹사이트 및 터미널 샌드박스 가상화 환경 서비스(이하 "서비스")를 이용함에 있어, 운영팀과 회원 간의 권리, 의무 및 책임 사항, 기타 필요한 제반 사항을 규정함을 목적으로 합니다.
    </Typography>
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5, mt: 4 }}>
      제 2 조 (용어의 정의)
    </Typography>
    <Typography variant="body2" color="#8892b0" paragraph sx={{ lineHeight: 1.8 }}>
      본 약관에서 사용하는 용어의 정의는 다음과 같습니다.<br />
      - <strong>서비스:</strong> 이용자가 웹 브라우저를 통해 격리된 가상 터미널 환경을 제어하고, 개발 지식 공유 및 미니게임을 체험할 수 있도록 제공하는 플랫폼 서비스 일체<br />
      - <strong>회원(이용자):</strong> 본 약관에 동의하고 사이트에 가입하여 서비스를 지속적으로 이용하는 자
    </Typography>
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5, mt: 4 }}>
      제 3 조 (이용제한 및 터미널 리소스 정책)
    </Typography>
    <Typography variant="body2" color="#8892b0" paragraph sx={{ lineHeight: 1.8 }}>
      1. 가상 터미널 환경은 개발 팁 테스트 등 공익 목적으로 무상 또는 플랜 정책에 따라 배분하여 제공됩니다.<br />
      2. 부정한 용도로 가상 터미널 리소스를 남용하거나 타 사용자에게 손해를 주는 비정상 작동 감지 시 세션이 강제 종료되거나 계정이 차단될 수 있습니다.
    </Typography>
  </>
);

const EN_CONTENT = (
  <>
    <Typography variant="h4" component="h1" fontWeight={800} color="#00ff66" gutterBottom sx={{ letterSpacing: '-1px' }}>
      📜 Terms of Service
    </Typography>
    <Typography variant="body2" color="#8892b0" sx={{ mb: 4 }}>
      Effective date: July 2, 2026
    </Typography>
    <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 4 }} />
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5 }}>
      Article 1 (Purpose)
    </Typography>
    <Typography variant="body2" color="#8892b0" paragraph sx={{ lineHeight: 1.8 }}>
      These Terms of Service aim to stipulate the rights, responsibilities, obligations, and general conditions between TerminalNexus Team ("Company") and users regarding the usage of the sandboxed virtual terminal environment and related web platform services.
    </Typography>
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5, mt: 4 }}>
      Article 2 (Definitions)
    </Typography>
    <Typography variant="body2" color="#8892b0" paragraph sx={{ lineHeight: 1.8 }}>
      The definitions of major terms are as follows:<br />
      - <strong>Service:</strong> All services provided by TerminalNexus allowing users to control sandboxed containers, access community forums, and play games.<br />
      - <strong>Member (User):</strong> An individual who registers an account and agrees to these Terms.
    </Typography>
    <Typography variant="h6" fontWeight={700} sx={{ color: '#fff', mb: 1.5, mt: 4 }}>
      Article 3 (Restrictions & Terminal Resource Policy)
    </Typography>
    <Typography variant="body2" color="#8892b0" paragraph sx={{ lineHeight: 1.8 }}>
      1. Virtual terminals are provided as isolated instances for sandbox testing and software experiments.<br />
      2. Any abuse of container resources (CPU/RAM hijacking, mining, DDoS attacks) will result in immediate termination of sessions and permanent ban of the account.
    </Typography>
  </>
);

const TermsOfServicePage = () => {
  const { i18n } = useTranslation();
  const isKo = i18n.language === 'ko';

  return (
    <>
      <Helmet>
        <title>{isKo ? "이용약관 - TerminalNexus" : "Terms of Service - TerminalNexus"}</title>
        <meta name="description" content={isKo ? "TerminalNexus의 서비스 이용약관입니다." : "Terms of Service guidelines for TerminalNexus."} />
      </Helmet>
      
      <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff', py: 10 }}>
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

export default TermsOfServicePage;
