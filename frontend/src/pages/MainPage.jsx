import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Trans, useTranslation } from 'react-i18next';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Paper, 
  Stack,
  Chip
} from '@mui/material';
import TerminalIcon from '@mui/icons-material/Terminal';
import StorageIcon from '@mui/icons-material/Storage';
import SpeedIcon from '@mui/icons-material/Speed';
import HubIcon from '@mui/icons-material/Hub';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import KeyboardCommandKeyIcon from '@mui/icons-material/KeyboardCommandKey';

import TerminalHero from '../components/TerminalHero';

const MainPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#000000', color: '#ffffff', overflowX: 'hidden' }}>
      <Helmet>
        <title>TerminalNexus | The Next Generation Cloud Environment</title>
        <meta name="description" content="브라우저에서 즉시 실행되는 완벽한 리눅스 터미널 환경. 클라우드 인프라와 개발자 커뮤니티가 결합된 새로운 차원의 플랫폼을 경험하세요." />
      </Helmet>
      
      {/* --- HERO SECTION --- */}
      <Box sx={{ 
        position: 'relative', 
        pt: { xs: 15, md: 22 }, 
        pb: { xs: 10, md: 15 },
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        zIndex: 1
      }}>
        {/* Glow Effects */}
        <Box sx={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '60vw', height: '60vw', maxWidth: '800px', maxHeight: '800px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(0,0,0,0) 70%)',
          zIndex: -1, pointerEvents: 'none'
        }} />

        <Container maxWidth="lg">
          <Chip 
            label={t('main.badge')}
            variant="outlined" 
            sx={{ 
                color: '#a855f7', 
                borderColor: 'rgba(168, 85, 247, 0.3)', 
                mb: 4, 
                fontWeight: 600,
                bgcolor: 'rgba(168, 85, 247, 0.05)'
            }} 
          />
          <Typography 
            variant="h1" 
            fontWeight="800" 
            sx={{ 
              mb: 3, 
              fontSize: { xs: '3rem', md: '5.5rem' },
              letterSpacing: '-2.5px',
              lineHeight: 1.1,
              background: 'linear-gradient(to right, #ffffff, #a1a1aa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              whiteSpace: 'pre-line'
            }}
          >
            <Trans i18nKey="main.hero_title">
              코드 하나로 연결되는\n무한한 <span style={{ background: 'linear-gradient(to right, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>터미널 스페이스</span>
            </Trans>
          </Typography>
          
          <Typography 
            variant="h6" 
            sx={{ 
              mb: 6, 
              color: '#a1a1aa',
              fontSize: { xs: '1.1rem', md: '1.3rem' },
              fontWeight: 400,
              maxWidth: 700,
              mx: 'auto',
              lineHeight: 1.6,
              whiteSpace: 'pre-line'
            }}
          >
            {t('main.hero_desc')}
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" mb={8}>
            <Button 
              variant="contained" 
              size="large" 
              onClick={() => navigate('/join')}
              endIcon={<ArrowForwardIcon />}
              sx={{ 
                px: 4, py: 1.5, fontSize: '1.1rem', borderRadius: '12px',
                bgcolor: '#ffffff', color: '#000000', fontWeight: 'bold',
                textTransform: 'none',
                '&:hover': { bgcolor: '#e4e4e7', transform: 'translateY(-2px)' },
                transition: 'all 0.2s',
                boxShadow: '0 0 20px rgba(255,255,255,0.2)'
              }}
            >
                {t('main.start_free')}
            </Button>
            <Button 
              variant="outlined" 
              size="large" 
              onClick={() => navigate('/guide')}
              endIcon={<KeyboardCommandKeyIcon />}
              sx={{ 
                px: 4, py: 1.5, fontSize: '1.1rem', borderRadius: '12px',
                color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)', fontWeight: 500,
                textTransform: 'none',
                bgcolor: 'rgba(255,255,255,0.03)',
                '&:hover': { 
                  borderColor: 'rgba(255,255,255,0.5)', 
                  bgcolor: 'rgba(255,255,255,0.08)',
                  transform: 'translateY(-2px)' 
                },
                transition: 'all 0.2s'
              }}
            >
                {t('main.view_docs')}
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* --- TERMINAL SHOWCASE --- */}
      <Container maxWidth="lg" sx={{ mb: 20 }}>
        <Box sx={{ 
            borderRadius: '16px', 
            p: 1, 
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.01) 100%)',
            boxShadow: '0 30px 60px rgba(0,0,0,0.8)'
        }}>
            <Box sx={{ 
                borderRadius: '12px', 
                overflow: 'hidden', 
                bgcolor: '#0a0a0a',
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                <TerminalHero />
            </Box>
        </Box>
      </Container>


      {/* --- FEATURES GRID (REALISTIC BENTO) --- */}
      <Container maxWidth="lg" sx={{ mb: 20 }}>
        <Typography 
            variant="h3" 
            fontWeight="bold" 
            sx={{ mb: 2, letterSpacing: '-1.5px', color: '#fff' }}
        >
            {t('main.features_title')}
        </Typography>
        <Typography sx={{ color: '#a1a1aa', fontSize: '1.2rem', mb: 8, maxWidth: 600 }}>
            {t('main.features_desc')}
        </Typography>

        <Grid container spacing={3}>
            {/* Feature 1 (Large Edge) */}
            <Grid item xs={12} md={7}>
                <Paper sx={{ 
                    p: 5, height: '100%', minHeight: 380,
                    bgcolor: '#09090b', color: 'white', borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    backgroundImage: 'radial-gradient(at 100% 0%, rgba(99,102,241,0.1) 0px, transparent 50%)'
                }}>
                    <Box>
                        <TerminalIcon sx={{ fontSize: 32, color: '#818cf8', mb: 3 }} />
                        <Typography variant="h4" fontWeight="800" sx={{ mb: 2, letterSpacing: '-1px' }}>
                            {t('main.ft1_title')}
                        </Typography>
                        <Typography sx={{ color: '#a1a1aa', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '90%' }}>
                            {t('main.ft1_desc')}
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mt: 4 }}>
                        <Chip label="Ubuntu 22.04" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                        <Chip label="Node.js 20.x" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                        <Chip label="Root Access" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: '#fff' }} />
                    </Box>
                </Paper>
            </Grid>

            {/* Feature 2 (Small Square with CLI) */}
            <Grid item xs={12} md={5}>
                <Paper sx={{ 
                    p: 5, height: '100%', minHeight: 380,
                    bgcolor: '#09090b', color: 'white', borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    position: 'relative', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}>
                    <Box>
                        <SpeedIcon sx={{ fontSize: 32, color: '#34d399', mb: 2 }} />
                        <Typography variant="h4" fontWeight="800" sx={{ mb: 2, letterSpacing: '-1px' }}>
                            {t('main.ft2_title')}
                        </Typography>
                        <Typography sx={{ color: '#a1a1aa', fontSize: '1rem', lineHeight: 1.6 }}>
                            {t('main.ft2_desc')}
                        </Typography>
                    </Box>
                    <Box sx={{ 
                        mt: 4, p: 2, borderRadius: '8px', bgcolor: '#000000', 
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontFamily: 'Consolas, monospace', fontSize: '0.85rem', color: '#a1a1aa'
                    }}>
                        <span style={{ color: '#fbbf24' }}>$</span> tn login<br/>
                        <span style={{ color: '#34d399' }}>✔ Authenticated successfully</span><br/><br/>
                        <span style={{ color: '#fbbf24' }}>$</span> tn ssh prod-web-1<br/>
                        <span style={{ color: '#60a5fa' }}>Connecting to terminal...</span><br/>
                        <span style={{ color: '#a855f7' }}>root@prod-web-1:~$</span> 
                        <Box component="span" sx={{ display: 'inline-block', width: 6, height: 12, bgcolor: '#ffffff', animation: 'blink 1s step-end infinite' }} />
                    </Box>
                </Paper>
            </Grid>

            {/* Feature 3 */}
            <Grid item xs={12} md={4}>
                <Paper sx={{ 
                    p: 5, height: '100%', minHeight: 350,
                    bgcolor: '#09090b', color: 'white', borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <StorageIcon sx={{ fontSize: 32, color: '#fbbf24', mb: 3 }} />
                    <Typography variant="h5" fontWeight="700" sx={{ mb: 2 }}>
                        {t('main.ft3_title')}
                    </Typography>
                    <Typography sx={{ color: '#a1a1aa', lineHeight: 1.6 }}>
                        {t('main.ft3_desc')}
                    </Typography>
                </Paper>
            </Grid>

            {/* Feature 4 */}
            <Grid item xs={12} md={8}>
                <Paper sx={{ 
                    p: 5, height: '100%', minHeight: 350,
                    bgcolor: '#09090b', color: 'white', borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    backgroundImage: 'radial-gradient(at 0% 100%, rgba(168,85,247,0.1) 0px, transparent 50%)'
                }}>
                    <Box>
                        <HubIcon sx={{ fontSize: 32, color: '#c084fc', mb: 3 }} />
                        <Typography variant="h4" fontWeight="800" sx={{ mb: 2, letterSpacing: '-1px' }}>
                            {t('main.ft4_title')}
                        </Typography>
                        <Typography sx={{ color: '#a1a1aa', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '80%' }}>
                            {t('main.ft4_desc')}
                        </Typography>
                    </Box>
                </Paper>
            </Grid>
        </Grid>
      </Container>

      {/* --- CTA SECTION --- */}
      <Box sx={{ 
        py: 15, 
        borderTop: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #000000 0%, #09090b 100%)'
      }}>
          <Container maxWidth="md">
              <Typography 
                variant="h2" 
                fontWeight="800" 
                sx={{ fontSize: { xs: '2.5rem', md: '4rem' }, letterSpacing: '-2px', mb: 4 }}
              >
                  {t('main.cta_title')}
              </Typography>
              <Typography sx={{ color: '#a1a1aa', fontSize: '1.2rem', mb: 6, whiteSpace: 'pre-line' }}>
                  {t('main.cta_desc')}
              </Typography>
              <Button 
                variant="contained" 
                size="large" 
                onClick={() => navigate('/join')}
                sx={{ 
                  px: 6, py: 2, fontSize: '1.1rem', borderRadius: '12px',
                  bgcolor: '#ffffff', color: '#000000', fontWeight: 'bold',
                  textTransform: 'none',
                  '&:hover': { bgcolor: '#e4e4e7', transform: 'scale(1.05)' },
                  transition: 'all 0.2s',
                  boxShadow: '0 0 30px rgba(255,255,255,0.15)'
                }}
              >
                  {t('main.cta_btn')}
              </Button>
          </Container>
      </Box>

    </Box>
  );
};

export default MainPage;
