import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Container,
  Typography,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

const GuidePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const steps = [
    {
      num: t('guide.step1_num'),
      title: t('guide.step1_title'),
      desc: t('guide.step1_desc'),
      color: '#818cf8',
      bg: 'rgba(129,140,248,0.07)',
      border: 'rgba(129,140,248,0.18)',
    },
    {
      num: t('guide.step2_num'),
      title: t('guide.step2_title'),
      desc: t('guide.step2_desc'),
      color: '#34d399',
      bg: 'rgba(52,211,153,0.07)',
      border: 'rgba(52,211,153,0.18)',
    },
    {
      num: t('guide.step3_num'),
      title: t('guide.step3_title'),
      desc: t('guide.step3_desc'),
      color: '#f9ca24',
      bg: 'rgba(249,202,36,0.07)',
      border: 'rgba(249,202,36,0.18)',
    },
    {
      num: t('guide.step4_num'),
      title: t('guide.step4_title'),
      desc: t('guide.step4_desc'),
      color: '#f472b6',
      bg: 'rgba(244,114,182,0.07)',
      border: 'rgba(244,114,182,0.18)',
    },
  ];

  const faqs = [
    { q: t('guide.faq1_q'), a: t('guide.faq1_a') },
    { q: t('guide.faq2_q'), a: t('guide.faq2_a') },
    { q: t('guide.faq3_q'), a: t('guide.faq3_a') },
  ];

  return (
    <>
      <Helmet>
        <title>이용안내 - TerminalNexus | 서비스 사용 가이드</title>
        <meta name="description" content="TerminalNexus 서비스 이용 방법을 안내합니다. 회원가입부터 터미널 사용까지 단계별로 알아보세요." />
        <meta name="keywords" content="이용안내, 사용법, 가이드, 터미널 사용, 회원가입 방법" />
        <link rel="canonical" href="https://tnhub.kr/guide" />
      </Helmet>

      <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff', overflowX: 'hidden' }}>

        {/* ── 히어로 ── */}
        <Box
          sx={{
            pt: { xs: 14, md: 18 },
            pb: { xs: 10, md: 14 },
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{
            position: 'absolute', top: '0%', left: '50%', transform: 'translateX(-50%)',
            width: '80vw', height: '80vw', maxWidth: 800, maxHeight: 800,
            background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
            <Chip
              label="Getting Started"
              sx={{
                mb: 3, bgcolor: 'rgba(99,102,241,0.08)',
                color: '#818cf8', border: '1px solid rgba(99,102,241,0.22)',
                fontWeight: 700, fontSize: '0.78rem',
              }}
            />
            <Typography
              variant="h1"
              component="h1"
              fontWeight={800}
              sx={{
                fontSize: { xs: '2.4rem', md: '3.6rem' },
                letterSpacing: '-2px',
                lineHeight: 1.12,
                mb: 3,
              }}
            >
              <span style={{
                background: 'linear-gradient(to right, #fff, #a1a1aa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {t('guide.title')}
              </span>
            </Typography>
            <Typography
              sx={{
                color: '#71717a',
                fontSize: { xs: '1rem', md: '1.1rem' },
                lineHeight: 1.75,
                whiteSpace: 'pre-line',
                maxWidth: 480,
                mx: 'auto',
              }}
            >
              {t('guide.subtitle')}
            </Typography>
          </Container>
        </Box>

        {/* ── 4단계 스텝 ── */}
        <Box sx={{ pb: { xs: 10, md: 14 } }}>
          <Container maxWidth="lg">
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 3,
              }}
            >
              {steps.map((step, i) => (
                <Box
                  key={step.num}
                  sx={{
                    p: { xs: 3, md: 4 },
                    borderRadius: '20px',
                    border: `1px solid ${step.border}`,
                    bgcolor: step.bg,
                    backdropFilter: 'blur(4px)',
                    transition: 'transform 0.25s, box-shadow 0.25s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: `0 16px 48px ${step.color}18`,
                    },
                  }}
                >
                  {/* 번호 배지 */}
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 44, height: 44,
                      borderRadius: '12px',
                      bgcolor: `${step.color}18`,
                      border: `1px solid ${step.color}30`,
                      mb: 2.5,
                    }}
                  >
                    <Typography
                      sx={{
                        color: step.color,
                        fontWeight: 800,
                        fontSize: '1rem',
                        fontVariantNumeric: 'tabular-nums',
                        letterSpacing: '-0.5px',
                      }}
                    >
                      {step.num}
                    </Typography>
                  </Box>

                  <Typography
                    variant="h6"
                    fontWeight={700}
                    sx={{ color: '#f4f4f5', mb: 1.5, fontSize: { xs: '1rem', md: '1.1rem' } }}
                  >
                    {step.title}
                  </Typography>
                  <Typography
                    sx={{ color: '#71717a', fontSize: { xs: '0.88rem', md: '0.93rem' }, lineHeight: 1.75 }}
                  >
                    {step.desc}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Container>
        </Box>

        {/* ── FAQ ── */}
        <Box
          sx={{
            py: { xs: 10, md: 14 },
            borderTop: '1px solid rgba(255,255,255,0.05)',
            bgcolor: '#09090b',
          }}
        >
          <Container maxWidth="md">
            <Typography
              variant="h2"
              fontWeight={800}
              textAlign="center"
              sx={{
                mb: 8,
                fontSize: { xs: '1.8rem', md: '2.4rem' },
                letterSpacing: '-1.5px',
                color: '#f4f4f5',
              }}
            >
              {t('guide.faq_title')}
            </Typography>

            <Stack spacing={2}>
              {faqs.map((faq, i) => (
                <Accordion
                  key={i}
                  expanded={expanded === i}
                  onChange={() => setExpanded(expanded === i ? false : i)}
                  disableGutters
                  elevation={0}
                  sx={{
                    bgcolor: expanded === i ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
                    border: expanded === i
                      ? '1px solid rgba(99,102,241,0.25)'
                      : '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '14px !important',
                    transition: 'all 0.25s',
                    '&:before': { display: 'none' },
                    overflow: 'hidden',
                  }}
                >
                  <AccordionSummary
                    expandIcon={
                      <ExpandMoreIcon
                        sx={{
                          color: expanded === i ? '#818cf8' : '#52525b',
                          transition: 'color 0.2s',
                        }}
                      />
                    }
                    sx={{ px: { xs: 3, md: 4 }, py: 2 }}
                  >
                    <Typography
                      fontWeight={600}
                      sx={{
                        color: expanded === i ? '#e4e4e7' : '#a1a1aa',
                        fontSize: { xs: '0.9rem', md: '0.98rem' },
                        transition: 'color 0.2s',
                        pr: 2,
                      }}
                    >
                      {faq.q}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: { xs: 3, md: 4 }, pb: 3 }}>
                    <Typography
                      sx={{ color: '#71717a', fontSize: { xs: '0.88rem', md: '0.93rem' }, lineHeight: 1.75 }}
                    >
                      {faq.a}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </Container>
        </Box>

        {/* ── 문의 + CTA ── */}
        <Box
          sx={{
            py: { xs: 10, md: 14 },
            borderTop: '1px solid rgba(255,255,255,0.05)',
            textAlign: 'center',
          }}
        >
          <Container maxWidth="sm">
            <Typography
              variant="h4"
              fontWeight={800}
              sx={{
                mb: 2,
                fontSize: { xs: '1.6rem', md: '2rem' },
                letterSpacing: '-1px',
                color: '#f4f4f5',
              }}
            >
              {t('guide.contact_title')}
            </Typography>
            <Typography sx={{ color: '#71717a', mb: 4, fontSize: { xs: '0.9rem', md: '0.95rem' } }}>
              {t('guide.contact_desc')}
            </Typography>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              justifyContent="center"
              alignItems="center"
            >
              <Box
                component="a"
                href={`mailto:${t('guide.contact_email')}`}
                sx={{
                  px: 4, py: 1.5,
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.12)',
                  bgcolor: 'rgba(255,255,255,0.04)',
                  color: '#e4e4e7',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  letterSpacing: '0.2px',
                  fontFamily: 'monospace',
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.08)',
                    borderColor: 'rgba(255,255,255,0.22)',
                  },
                }}
              >
                ✉ {t('guide.contact_email')}
              </Box>
              <Button
                variant="contained"
                endIcon={<ArrowForwardIcon />}
                onClick={() => navigate('/join')}
                sx={{
                  px: 4, py: 1.5,
                  borderRadius: '12px',
                  bgcolor: '#fff', color: '#000',
                  fontWeight: 700, textTransform: 'none',
                  fontSize: '0.9rem',
                  '&:hover': { bgcolor: '#e4e4e7', transform: 'translateY(-2px)' },
                  transition: 'all 0.2s',
                }}
              >
                무료로 시작하기
              </Button>
            </Stack>
          </Container>
        </Box>

      </Box>
    </>
  );
};

export default GuidePage;
