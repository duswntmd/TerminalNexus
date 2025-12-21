import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Paper, 
  Stack,
  IconButton,
  Card,
  CardContent,
  Avatar,
  LinearProgress,
  Chip
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CodeIcon from '@mui/icons-material/Code';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import SecurityIcon from '@mui/icons-material/Security';

import TerminalHero from '../components/TerminalHero';

// --- Assets & Data ---
const bannerData = [
    {
        id: 1,
        title: "개발자를 위한 최고의 놀이터",
        desc: "코드를 작성하고, 공유하고, 함께 성장하세요",
        bgColor: '#0a192f',
        imgUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop"
    },
    {
        id: 2,
        title:  "지식 공유의 새로운 방법",
        desc: "당신의 경험이 누군가에게는 정답입니다",
        bgColor: '#1e3a5f',
        imgUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=2070&auto=format&fit=crop"
    },
    {
        id: 3,
        title: "함께 만드는 미래",
        desc: "오픈소스, 스터디, 프로젝트. 동료들과 함께 성장하세요",
        bgColor: '#2d1b69',
        imgUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2070&auto=format&fit=crop"
    }
];

const MainPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // --- Carousel Logic ---
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % bannerData.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
      setCurrentSlide((prev) => (prev === 0 ? bannerData.length - 1 : prev - 1));
  };
  const handleNext = () => {
      setCurrentSlide((prev) => (prev + 1) % bannerData.length);
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#fafafa' }}>
      
      {/* === SECTION 1: Hero Banner (Carousel) === */}
      <Box sx={{ 
          position: 'relative', 
          width: '100%', 
          height: { xs: '500px', md: '650px' },
          overflow: 'hidden',
          bgcolor: '#000'
      }}>
          {bannerData.map((slide, index) => (
              <Box
                  key={slide.id}
                  sx={{
                      position: 'absolute',
                      top: 0, 
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: index === currentSlide ? 1 : 0,
                      transition: 'opacity 1s ease-in-out',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                  }}
              >
                  <Box sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundImage: `url(${slide.imgUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'brightness(0.35)'
                  }} />
                  
                  <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
                      <Typography 
                        variant="h1" 
                        fontWeight="900" 
                        sx={{ 
                          mb: 3, 
                          color: 'white',
                          fontSize: { xs: '2.5rem', md: '4rem' },
                          textShadow: '0 4px 20px rgba(0,0,0,0.8)',
                          letterSpacing: '-2px'
                        }}
                      >
                          {slide.title}
                      </Typography>
                      <Typography 
                        variant="h5" 
                        sx={{ 
                          mb: 5, 
                          color: 'rgba(255,255,255,0.9)',
                          fontSize: { xs: '1rem', md: '1.5rem' },
                          fontWeight: 400,
                          maxWidth: 600,
                          mx: 'auto'
                        }}
                      >
                          {slide.desc}
                      </Typography>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                        <Button 
                          variant="contained" 
                          size="large" 
                          onClick={() => navigate('/join')}
                          sx={{ 
                            px: 5, 
                            py: 2, 
                            fontSize: '1.1rem', 
                            borderRadius: 2, 
                            fontWeight: 'bold',
                            bgcolor: 'primary.main',
                            '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.02)' },
                            transition: 'all 0.2s'
                          }}
                        >
                            무료로 시작하기
                        </Button>
                        <Button 
                          variant="outlined" 
                          size="large" 
                          onClick={() => navigate('/guide')}
                          sx={{ 
                            px: 5, 
                            py: 2, 
                            fontSize: '1.1rem', 
                            borderRadius: 2, 
                            fontWeight: 'bold',
                            color: 'white',
                            borderColor: 'rgba(255,255,255,0.5)',
                            '&:hover': { 
                              borderColor: 'white', 
                              bgcolor: 'rgba(255,255,255,0.1)',
                              transform: 'scale(1.02)' 
                            },
                            transition: 'all 0.2s'
                          }}
                        >
                            더 알아보기
                        </Button>
                      </Stack>
                  </Container>
              </Box>
          ))}
          
          {/* Navigation Arrows */}
          <IconButton 
            onClick={handlePrev}
            sx={{ 
              position: 'absolute', 
              top: '50%', 
              left: { xs: 10, md: 30 }, 
              transform: 'translateY(-50%)', 
              color: 'white', 
              zIndex: 3, 
              bgcolor: 'rgba(0,0,0,0.4)', 
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
            }}
          >
              <ArrowBackIosNewIcon />
          </IconButton>
          <IconButton 
            onClick={handleNext}
            sx={{ 
              position: 'absolute', 
              top: '50%', 
              right: { xs: 10, md: 30 }, 
              transform: 'translateY(-50%)', 
              color: 'white', 
              zIndex: 3, 
              bgcolor: 'rgba(0,0,0,0.4)', 
              '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
            }}
          >
              <ArrowForwardIosIcon />
          </IconButton>
          
          {/* Slide Indicators */}
          <Stack 
            direction="row" 
            spacing={1.5} 
            sx={{ 
              position: 'absolute', 
              bottom: 40, 
              left: '50%', 
              transform: 'translateX(-50%)', 
              zIndex: 3 
            }}
          >
              {bannerData.map((_, idx) => (
                  <Box 
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    sx={{
                        width: idx === currentSlide ? 32 : 10,
                        height: 10,
                        borderRadius: 5,
                        bgcolor: idx === currentSlide ? 'primary.main' : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                    }}
                  />
              ))}
          </Stack>
      </Box>

      {/* === SECTION 2: Interactive Terminal === */}
      <Box sx={{ 
          py: { xs: 8, md: 15 },
          bgcolor: '#fff',
          borderBottom: '1px solid #e0e0e0'
      }}>
          <Container maxWidth="xl">
              <Grid container spacing={6} alignItems="center">
                  <Grid item xs={12} md={5}>
                      <Box sx={{ pr: { md: 4 } }}>
                          <Chip 
                            icon={<CodeIcon />} 
                            label="LIVE DEMO" 
                            color="primary" 
                            sx={{ mb: 3, fontWeight: 'bold' }}
                          />
                          <Typography 
                            variant="h2" 
                            fontWeight="900" 
                            gutterBottom
                            sx={{ 
                              fontSize: { xs: '2rem', md: '3rem' },
                              lineHeight: 1.2,
                              letterSpacing: '-1px'
                            }}
                          >
                              브라우저에서 바로
                              <br/>실행되는 터미널
                          </Typography>
                          <Typography 
                            variant="h6" 
                            color="text.secondary" 
                            paragraph
                            sx={{ 
                              mb: 4,
                              lineHeight: 1.7,
                              fontSize: '1.1rem'
                            }}
                          >
                              복잡한 설치 과정 없이 웹에서 바로 리눅스 명령어를 실행하고 
                              결과를 확인할 수 있습니다. 교육, 테스트, 프로토타이핑에 완벽합니다.
                          </Typography>
                          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                             <Chip 
                               icon={<AutoFixHighIcon />} 
                               label="Node.js 20 지원" 
                               variant="outlined" 
                               sx={{ fontWeight: 500 }}
                             />
                             <Chip 
                               icon={<SecurityIcon />} 
                               label="샌드박스 보안" 
                               variant="outlined" 
                               color="success"
                               sx={{ fontWeight: 500 }}
                             />
                          </Stack>
                      </Box>
                  </Grid>
                  <Grid item xs={12} md={7}>
                      <Box sx={{ 
                        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                        borderRadius: 3,
                        overflow: 'hidden'
                      }}>
                          <TerminalHero />
                      </Box>
                  </Grid>
              </Grid>
          </Container>
      </Box>

      {/* === SECTION 3: Features Grid (Bento Style) === */}
      <Box sx={{ py: { xs: 8, md: 15 }, bgcolor: '#fafafa' }}>
        <Container maxWidth="xl">
           {/* Section Header */}
           <Box sx={{ textAlign: 'center', mb: 10 }}>
              <Typography 
                variant="h2" 
                fontWeight="900" 
                gutterBottom 
                sx={{ 
                  letterSpacing: '-2px',
                  fontSize: { xs: '2rem', md: '3.5rem' }
                }}
              >
                모든 것이 하나로
              </Typography>
              <Typography 
                variant="h5" 
                color="text.secondary" 
                sx={{ 
                  maxWidth: 700, 
                  mx: 'auto',
                  fontWeight: 400,
                  lineHeight: 1.6
                }}
              >
                복잡한 워크플로우를 하나의 플랫폼에서.
                <br/>TerminalNexus가 제공하는 강력한 도구들을 확인하세요.
              </Typography>
           </Box>

           {/* Feature Grid - 균형잡힌 레이아웃 */}
           <Grid container spacing={2.5}>
               
               {/* Row 1 */}
               <Grid item xs={12} md={8}>
                   <Paper 
                     elevation={0}
                     sx={{ 
                         height: '100%',
                         minHeight: 420,
                         bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                         background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                         borderRadius: 4,
                         p: 5,
                         color: 'white',
                         display: 'flex',
                         flexDirection: 'column',
                         justifyContent: 'space-between',
                         position: 'relative',
                         overflow: 'hidden',
                         transition: 'transform 0.3s',
                         '&:hover': { transform: 'translateY(-8px)' },
                         boxShadow: '0 10px 40px rgba(102,126,234,0.3)'
                     }}
                   >
                      <Box sx={{ position: 'relative', zIndex: 2 }}>
                          <TrendingUpIcon sx={{ fontSize: 48, mb: 2, opacity: 0.9 }} />
                          <Typography variant="h3" fontWeight="bold" gutterBottom>
                              실시간 분석
                          </Typography>
                          <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: '70%', lineHeight: 1.6 }}>
                              사용자 행동을 실시간으로 추적하고 인사이트를 얻으세요.
                              데이터 기반 의사결정으로 성장을 가속화합니다.
                          </Typography>
                      </Box>
                      <Box sx={{ 
                        position: 'absolute',
                        right: -50,
                        bottom: -50,
                        width: 300,
                        height: 300,
                        borderRadius: '50%',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        filter: 'blur(60px)'
                      }} />
                   </Paper>
               </Grid>

               <Grid item xs={12} md={4}>
                   <Paper 
                     elevation={0}
                     sx={{ 
                         height: '100%',
                         minHeight: 420,
                         bgcolor: '#1a1a2e',
                         color: 'white',
                         borderRadius: 4,
                         p: 5,
                         display: 'flex',
                         flexDirection: 'column',
                         justifyContent: 'space-between',
                         transition: 'transform 0.3s',
                         '&:hover': { transform: 'translateY(-8px)' },
                         boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                     }}
                   >
                       <Box>
                           <SecurityIcon sx={{ fontSize: 52, color: '#00d4aa', mb: 2 }} />
                           <Typography variant="h4" fontWeight="bold" gutterBottom>
                               엔터프라이즈 보안
                           </Typography>
                           <Typography variant="body1" sx={{ opacity: 0.8, lineHeight: 1.7, mb: 3 }}>
                               군사급 암호화와 24/7 보안 모니터링.
                               <br/>당신의 데이터는 언제나 안전합니다.
                           </Typography>
                       </Box>
                       <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                           <Chip 
                             label="ISO 27001" 
                             size="small"
                             sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold' }} 
                           />
                           <Chip 
                             label="SOC 2 Type II" 
                             size="small"
                             sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold' }} 
                           />
                           <Chip 
                             label="GDPR" 
                             size="small"
                             sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 'bold' }} 
                           />
                       </Stack>
                   </Paper>
               </Grid>

               {/* Row 2 */}
               <Grid item xs={12} md={6}>
                   <Paper 
                     elevation={0}
                     sx={{ 
                         height: '100%',
                         minHeight: 400,
                         bgcolor: '#f0f4ff',
                         borderRadius: 4,
                         p: 5,
                         display: 'flex',
                         flexDirection: 'column',
                         transition: 'transform 0.3s',
                         '&:hover': { transform: 'translateY(-8px)' },
                         border: '2px solid #e0e7ff',
                         boxShadow: '0 4px 20px rgba(99,102,241,0.1)'
                     }}
                   >
                       <CodeIcon sx={{ fontSize: 48, color: '#4f46e5', mb: 2 }} />
                       <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: '#1e293b' }}>
                           Developer API
                       </Typography>
                       <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
                           단 몇 줄의 코드로 모든 기능을 연동하세요.
                       </Typography>
                       <Box sx={{ 
                           bgcolor: '#1e293b',
                           p: 3,
                           borderRadius: 2,
                           fontFamily: 'Consolas, Monaco, monospace',
                           fontSize: '0.875rem',
                           color: '#e2e8f0',
                           lineHeight: 1.6,
                           flexGrow: 1,
                           boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.2)'
                       }}>
                           <span style={{color:'#f472b6'}}>import</span> TN <span style={{color:'#f472b6'}}>from</span> <span style={{color:'#a5f3fc'}}>'@tn/sdk'</span>;<br/><br/>
                           <span style={{color:'#fbbf24'}}>const</span> client = <span style={{color:'#f472b6'}}>new</span> TN.<span style={{color:'#60a5fa'}}>Client</span>();<br/>
                           <span style={{color:'#f472b6'}}>await</span> client.<span style={{color:'#60a5fa'}}>connect</span>();<br/><br/>
                           <span style={{color:'#6b7280'}}>// 완료! 🎉</span>
                       </Box>
                   </Paper>
               </Grid>

               <Grid item xs={12} md={6}>
                   <Paper 
                     elevation={0}
                     sx={{ 
                         height: '100%',
                         minHeight: 400,
                         background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                         borderRadius: 4,
                         p: 5,
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'space-between',
                         flexWrap: 'wrap',
                         gap: 3,
                         transition: 'transform 0.3s',
                         '&:hover': { transform: 'translateY(-8px)' },
                         boxShadow: '0 10px 40px rgba(245,87,108,0.3)'
                     }}
                   >
                       <Box sx={{ maxWidth: { xs: '100%', md: '100%' }, textAlign: 'center', width: '100%' }}>
                            <RocketLaunchIcon sx={{ fontSize: 56, color: 'white', mb: 2 }} />
                            <Typography variant="h2" fontWeight="900" sx={{ color: 'white', mb: 1 }}>
                                10,000+
                            </Typography>
                            <Typography variant="h5" fontWeight="600" sx={{ color: 'rgba(255,255,255,0.95)', mb: 2 }}>
                                활발한 개발자 커뮤니티
                            </Typography>
                            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', mb: 3 }}>
                                질문하고, 답변하고, 함께 성장하세요
                            </Typography>
                            
                            {/* Avatar Group */}
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, gap: -1 }}>
                               {[11,12,13,14,15].map((num) => (
                                   <Avatar 
                                    key={num}
                                    sx={{ 
                                        width: 56,
                                        height: 56,
                                        border: '3px solid white',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                    }}
                                    src={`https://i.pravatar.cc/150?img=${num}`}
                                   />
                               ))}
                            </Box>
                            
                            <Button 
                                variant="contained"
                                size="large"
                                onClick={() => navigate('/freeboard')}
                                sx={{ 
                                    bgcolor: 'white',
                                    color: '#f5576c',
                                    fontWeight: 'bold',
                                    borderRadius: 50,
                                    px: 5,
                                    py: 1.5,
                                    '&:hover': { bgcolor: '#fff5f7', transform: 'scale(1.05)' },
                                    boxShadow: '0 8px 20px rgba(0,0,0,0.15)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                커뮤니티 입장하기
                            </Button>
                       </Box>
                   </Paper>
               </Grid>
           </Grid>

        </Container>
      </Box>

      {/* === SECTION 4: CTA (Call to Action) === */}
      <Box sx={{ 
        py: { xs: 10, md: 15 }, 
        bgcolor: '#0f172a',
        color: 'white',
        textAlign: 'center'
      }}>
          <Container maxWidth="md">
              <Typography 
                variant="h2" 
                fontWeight="900" 
                gutterBottom
                sx={{ 
                  fontSize: { xs: '2rem', md: '3.5rem' },
                  letterSpacing: '-1px',
                  mb: 3
                }}
              >
                  무엇을 기다리고 계신가요?
              </Typography>
              <Typography 
                variant="h5" 
                sx={{ 
                  mb: 6, 
                  opacity: 0.8,
                  fontWeight: 400,
                  lineHeight: 1.6
                }}
              >
                  지금 바로 TerminalNexus를 시작하고<br/>
                  개발의 새로운 경험을 느껴보세요.
                  <br/>신용카드는 필요하지 않습니다.
              </Typography>
              <Stack 
                direction={{ xs: 'column', sm: 'row' }} 
                spacing={2} 
                justifyContent="center"
              >
                <Button 
                    variant="contained"
                    size="large"
                    onClick={() => navigate('/join')}
                    sx={{ 
                      px: 7,
                      py: 2.5,
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      borderRadius: 2,
                      bgcolor: 'primary.main',
                      boxShadow: '0 8px 30px rgba(25,118,210,0.4)',
                      '&:hover': { 
                        bgcolor: 'primary.dark',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 12px 40px rgba(25,118,210,0.5)'
                      },
                      transition: 'all 0.3s'
                    }}
                >
                    무료로 시작하기
                </Button>
                <Button 
                    variant="outlined"
                    size="large"
                    onClick={() => navigate('/guide')}
                    sx={{ 
                      px: 7,
                      py: 2.5,
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      borderRadius: 2,
                      color: 'white',
                      borderColor: 'rgba(255,255,255,0.3)',
                      '&:hover': {
                        borderColor: 'white',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        transform: 'translateY(-2px)'
                      },
                      transition: 'all 0.3s'
                    }}
                >
                    더 알아보기
                </Button>
              </Stack>
          </Container>
      </Box>

    </Box>
  );
};

export default MainPage;
