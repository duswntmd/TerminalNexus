import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { Container, Paper, Typography, Box, List, ListItem, ListItemIcon, ListItemText, Divider } from '@mui/material';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import Looks3Icon from '@mui/icons-material/Looks3';
import Looks4Icon from '@mui/icons-material/Looks4';
import InfoIcon from '@mui/icons-material/Info';

const GuidePage = () => {
    const { t } = useTranslation();

    const steps = [
        { 
            icon: <LooksOneIcon color="primary" />, 
            text: <Trans i18nKey="guide.step_1"><strong>회원가입</strong>: 상단 메뉴의 '회원가입'을 통해 계정을 생성하세요.</Trans> 
        },
        { 
            icon: <LooksTwoIcon color="primary" />, 
            text: <Trans i18nKey="guide.step_2"><strong>로그인</strong>: 생성한 계정으로 로그인하여 서비스를 이용하세요.</Trans> 
        },
        { 
            icon: <Looks3Icon color="primary" />, 
            text: <Trans i18nKey="guide.step_3"><strong>터미널 관리</strong>: 로그인 후 대시보드에서 터미널을 관리할 수 있습니다.</Trans> 
        },
        { 
            icon: <Looks4Icon color="primary" />, 
            text: <Trans i18nKey="guide.step_4"><strong>마이페이지</strong>: 개인 정보 수정 및 회원 탈퇴는 마이페이지에서 가능합니다.</Trans> 
        }
    ];

    return (
        <>
        <Helmet>
            <title>이용안내 - TerminalNexus | 서비스 사용 가이드</title>
            <meta name="description" content="TerminalNexus 서비스 이용 방법을 안내합니다. 회원가입부터 터미널 사용까지 단계별로 알아보세요." />
            <meta name="keywords" content="이용안내, 사용법, 가이드, 터미널 사용, 회원가입 방법" />
            <link rel="canonical" href="https://tnhub.kr/guide" />
        </Helmet>
        <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
            <Paper elevation={3} sx={{ p: 5, borderRadius: 2 }}>
                <Box display="flex" alignItems="center" gap={2} mb={3}>
                    <InfoIcon fontSize="large" color="action" />
                    <Typography variant="h4" component="h1" fontWeight="bold">
                        {t('guide.title')}
                    </Typography>
                </Box>
                
                <Divider sx={{ mb: 4 }} />

                <Typography variant="body1" paragraph fontSize="1.1rem" color="text.secondary">
                    {t('guide.welcome')}
                </Typography>

                <List sx={{ mt: 2 }}>
                    {steps.map((step, index) => (
                        <ListItem key={index} alignItems="flex-start" sx={{ mb: 2 }}>
                            <ListItemIcon sx={{ mt: 0.5 }}>
                                {step.icon}
                            </ListItemIcon>
                            <ListItemText 
                                primary={
                                    <Typography variant="body1" fontSize="1.1rem">
                                        {step.text}
                                    </Typography>
                                } 
                            />
                        </ListItem>
                    ))}
                </List>

                <Box mt={6} p={3} bgcolor="#f9f9f9" borderRadius={2} border="1px solid #eee">
                    <Typography variant="body2" color="text.secondary">
                        {t('guide.contact')}
                    </Typography>
                </Box>
            </Paper>
        </Container>
        </>
    );
};

export default GuidePage;
