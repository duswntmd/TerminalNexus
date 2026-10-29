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

// 카테고리별 강조 색상
const GROUP_COLORS = ['var(--tn-tape)', '#34d399', '#f9ca24'];

const GuidePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const groups = t('guide.groups', { returnObjects: true });
  const steps = t('guide.steps', { returnObjects: true });
  const faqs = t('guide.faqs', { returnObjects: true });

  const sectionTitleSx = {
    mb: { xs: 5, md: 7 },
    fontSize: { xs: '1.8rem', md: '2.4rem' },
    letterSpacing: '-1.5px',
    color: '#f4f4f5',
  };

  return (
    <>
      <Helmet>
        <title>소개 - TerminalNexus | 커뮤니티와 미니게임</title>
        <meta name="description" content="TerminalNexus는 자유게시판·실시간 채팅 커뮤니티와 모의 주식, 장기, 강화, 타자 게임 등 미니게임을 무료로 즐길 수 있는 터미널 감성의 개발자 놀이터입니다." />
        <meta name="keywords" content="TerminalNexus, 모의 주식, 장기, 타자 게임, 강화 게임, 커뮤니티, 채팅" />
        <link rel="canonical" href="https://tnhub.kr/guide" />
      </Helmet>

      <Box sx={{ minHeight: '100vh', bgcolor: 'var(--tn-bg)', color: '#fff', overflowX: 'hidden' }}>

        {/* ── 히어로 ── */}
        <Box
          sx={{
            pt: { xs: 14, md: 18 },
            pb: { xs: 8, md: 12 },
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box sx={{
            position: 'absolute', top: '0%', left: '50%', transform: 'translateX(-50%)',
            width: '80vw', height: '80vw', maxWidth: 800, maxHeight: 800,
            background: 'radial-gradient(circle, rgba(242,194,48,0.1) 0%, transparent 65%)',
            pointerEvents: 'none',
          }} />

          <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
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
                color: 'var(--tn-text-3)',
                fontSize: { xs: '1rem', md: '1.1rem' },
                lineHeight: 1.75,
                whiteSpace: 'pre-line',
                maxWidth: 520,
                mx: 'auto',
              }}
            >
              {t('guide.subtitle')}
            </Typography>
          </Container>
        </Box>

        {/* ── 기능 소개 (카테고리별 카드, 클릭 시 이동) ── */}
        <Box sx={{ pb: { xs: 10, md: 14 } }}>
          <Container maxWidth="lg">
            <Typography variant="h2" fontWeight={800} textAlign="center" sx={sectionTitleSx}>
              {t('guide.features_title')}
            </Typography>

            <Stack spacing={{ xs: 6, md: 8 }}>
              {groups.map((group, gi) => {
                const color = GROUP_COLORS[gi % GROUP_COLORS.length];
                return (
                  <Box key={group.name}>
                    <Typography
                      sx={{
                        color, fontWeight: 800, fontSize: '0.85rem',
                        letterSpacing: '1px', mb: 2, textTransform: 'uppercase',
                      }}
                    >
                      {group.name}
                    </Typography>
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                        gap: 2.5,
                      }}
                    >
                      {group.items.map((item) => (
                        <Box
                          key={item.name}
                          component="button"
                          type="button"
                          onClick={() => navigate(item.path)}
                          sx={{
                            textAlign: 'left',
                            font: 'inherit',
                            cursor: 'pointer',
                            p: { xs: 3, md: 3.5 },
                            borderRadius: '20px',
                            border: `1px solid ${color}2e`,
                            bgcolor: `${color}0d`,
                            color: 'inherit',
                            transition: 'transform 0.25s, box-shadow 0.25s, border-color 0.25s',
                            '&:hover, &:focus-visible': {
                              transform: 'translateY(-4px)',
                              boxShadow: `0 16px 48px ${color}18`,
                              borderColor: `${color}66`,
                              outline: 'none',
                            },
                          }}
                        >
                          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                            <Box sx={{ fontSize: '1.6rem', lineHeight: 1 }} aria-hidden="true">{item.icon}</Box>
                            <Typography fontWeight={700} sx={{ color: '#f4f4f5', fontSize: { xs: '1rem', md: '1.08rem' } }}>
                              {item.name}
                            </Typography>
                            {item.login && (
                              <Chip
                                label={t('guide.login_required')}
                                size="small"
                                sx={{
                                  ml: 'auto !important', height: 22, fontSize: '0.7rem', fontWeight: 600,
                                  bgcolor: 'rgba(255,255,255,0.06)', color: 'var(--tn-text-2)',
                                }}
                              />
                            )}
                          </Stack>
                          <Typography sx={{ color: '#8b8b94', fontSize: { xs: '0.88rem', md: '0.92rem' }, lineHeight: 1.7 }}>
                            {item.desc}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Container>
        </Box>

        {/* ── 시작하는 방법 ── */}
        <Box sx={{ py: { xs: 10, md: 14 }, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Container maxWidth="lg">
            <Typography variant="h2" fontWeight={800} textAlign="center" sx={sectionTitleSx}>
              {t('guide.start_title')}
            </Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
                gap: 3,
              }}
            >
              {steps.map((step, i) => (
                <Box
                  key={step.title}
                  sx={{
                    p: { xs: 3, md: 4 },
                    borderRadius: '20px',
                    border: '1px solid rgba(255,255,255,0.07)',
                    bgcolor: 'rgba(255,255,255,0.02)',
                  }}
                >
                  <Box
                    sx={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 40, height: 40, borderRadius: '12px', mb: 2,
                      bgcolor: 'rgba(242,194,48,0.12)', border: '1px solid rgba(242,194,48,0.25)',
                      color: 'var(--tn-tape)', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {i + 1}
                  </Box>
                  <Typography fontWeight={700} sx={{ color: '#f4f4f5', mb: 1, fontSize: '1.05rem' }}>
                    {step.title}
                  </Typography>
                  <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.92rem', lineHeight: 1.7 }}>
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
            bgcolor: 'var(--tn-panel)',
          }}
        >
          <Container maxWidth="md">
            <Typography variant="h2" fontWeight={800} textAlign="center" sx={sectionTitleSx}>
              {t('guide.faq_title')}
            </Typography>

            <Stack spacing={2}>
              {faqs.map((faq, i) => (
                <Accordion
                  key={faq.q}
                  expanded={expanded === i}
                  onChange={() => setExpanded(expanded === i ? false : i)}
                  disableGutters
                  elevation={0}
                  sx={{
                    bgcolor: expanded === i ? 'rgba(242,194,48,0.06)' : 'rgba(255,255,255,0.02)',
                    border: expanded === i
                      ? '1px solid rgba(242,194,48,0.25)'
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
                          color: expanded === i ? 'var(--tn-tape)' : 'var(--tn-text-3)',
                          transition: 'color 0.2s',
                        }}
                      />
                    }
                    sx={{ px: { xs: 3, md: 4 }, py: 2 }}
                  >
                    <Typography
                      fontWeight={600}
                      sx={{
                        color: expanded === i ? '#e4e4e7' : 'var(--tn-text-2)',
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
                      sx={{ color: 'var(--tn-text-3)', fontSize: { xs: '0.88rem', md: '0.93rem' }, lineHeight: 1.75 }}
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
            <Typography sx={{ color: 'var(--tn-text-3)', mb: 4, fontSize: { xs: '0.9rem', md: '0.95rem' } }}>
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
                  bgcolor: 'var(--tn-tape)', color: 'var(--tn-tape-ink)',
                  fontWeight: 700, textTransform: 'none',
                  fontSize: '0.9rem',
                  '&:hover': { bgcolor: 'var(--tn-tape-hover)', transform: 'translateY(-2px)' },
                  transition: 'all 0.2s',
                }}
              >
                {t('guide.cta')}
              </Button>
            </Stack>
          </Container>
        </Box>

      </Box>
    </>
  );
};

export default GuidePage;
