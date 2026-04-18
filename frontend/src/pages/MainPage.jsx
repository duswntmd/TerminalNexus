import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Chip,
  Paper,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import KeyboardCommandKeyIcon from '@mui/icons-material/KeyboardCommandKey';
import CasinoIcon from '@mui/icons-material/Casino';
import TerminalHero from '../components/TerminalHero';

/* ──────────────────────────────────────────────
   로또 볼 색상 정의
────────────────────────────────────────────── */
const LOTTO_COLORS = ['#f9ca24', '#6ab04c', '#e84393', '#0652DD', '#9b59b6'];
const getBallColor = (n) => {
  if (n <= 10) return LOTTO_COLORS[0];
  if (n <= 20) return LOTTO_COLORS[1];
  if (n <= 30) return LOTTO_COLORS[2];
  if (n <= 40) return LOTTO_COLORS[3];
  return LOTTO_COLORS[4];
};

/* ──────────────────────────────────────────────
   결과 표시용 로또볼
────────────────────────────────────────────── */
const LottoBall = ({ number, visible, size = 54 }) => {
  const color = getBallColor(number);
  return (
    <Box
      sx={{
        width: { xs: 42, sm: 48, md: size },
        height: { xs: 42, sm: 48, md: size },
        borderRadius: '50%',
        background: `
          radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, transparent 50%),
          radial-gradient(circle at 68% 72%, rgba(0,0,0,0.18) 0%, transparent 45%),
          radial-gradient(circle, ${color} 60%, ${color}cc 100%)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 6px 20px ${color}66, inset 0 -4px 10px rgba(0,0,0,0.22)`,
        border: `2px solid ${color}aa`,
        flexShrink: 0,
        transform: visible ? 'scale(1) translateY(0)' : 'scale(0) translateY(-30px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.38s ease',
      }}
    >
      <Typography
        sx={{
          fontWeight: 900,
          fontSize: { xs: '0.8rem', sm: '0.9rem', md: `${size * 0.32}px` },
          color: '#fff',
          textShadow: '0 1px 5px rgba(0,0,0,0.5)',
          userSelect: 'none',
          lineHeight: 1,
        }}
      >
        {number}
      </Typography>
    </Box>
  );
};

/* ──────────────────────────────────────────────
   추첨 기계 CSS keyframes
────────────────────────────────────────────── */
const MACHINE_STYLES = `
  @keyframes lb0 {
    0%   { transform: translate(-28px,  18px) scale(0.88); }
    12%  { transform: translate( 32px, -24px) scale(1.05); }
    27%  { transform: translate(  8px,  35px) scale(0.92); }
    41%  { transform: translate(-40px,  -8px) scale(1.08); }
    56%  { transform: translate( 22px,  28px) scale(0.95); }
    70%  { transform: translate(-12px, -38px) scale(1.04); }
    85%  { transform: translate( 38px,   4px) scale(0.9); }
    100% { transform: translate(-28px,  18px) scale(0.88); }
  }
  @keyframes lb1 {
    0%   { transform: translate( 30px, -20px) scale(1.02); }
    15%  { transform: translate(-15px,  36px) scale(0.87); }
    30%  { transform: translate( 40px,  10px) scale(1.1); }
    48%  { transform: translate( -8px, -35px) scale(0.93); }
    62%  { transform: translate(-34px,  22px) scale(1.06); }
    78%  { transform: translate( 18px,  -6px) scale(0.9); }
    90%  { transform: translate( -5px,  30px) scale(1.03); }
    100% { transform: translate( 30px, -20px) scale(1.02); }
  }
  @keyframes lb2 {
    0%   { transform: translate(  5px,  32px) scale(0.91); }
    18%  { transform: translate(-38px, -10px) scale(1.07); }
    34%  { transform: translate( 25px,  -30px) scale(0.89); }
    50%  { transform: translate( 15px,  40px) scale(1.04); }
    65%  { transform: translate(-22px,   8px) scale(0.93); }
    82%  { transform: translate( 35px,  -18px) scale(1.09); }
    100% { transform: translate(  5px,  32px) scale(0.91); }
  }
  @keyframes lb3 {
    0%   { transform: translate(-35px, -12px) scale(1.06); }
    20%  { transform: translate( 20px,  38px) scale(0.88); }
    38%  { transform: translate(-10px, -28px) scale(1.1); }
    55%  { transform: translate( 38px,  15px) scale(0.9); }
    72%  { transform: translate( -5px,  -40px) scale(1.03); }
    88%  { transform: translate(-30px,  25px) scale(0.92); }
    100% { transform: translate(-35px, -12px) scale(1.06); }
  }
  @keyframes lb4 {
    0%   { transform: translate( 22px,  30px) scale(0.9); }
    14%  { transform: translate(-32px,  -5px) scale(1.08); }
    28%  { transform: translate( 10px, -35px) scale(0.87); }
    45%  { transform: translate( 40px,  20px) scale(1.05); }
    60%  { transform: translate(-18px,  35px) scale(0.92); }
    75%  { transform: translate( 28px, -22px) scale(1.07); }
    90%  { transform: translate( -8px,   5px) scale(0.95); }
    100% { transform: translate( 22px,  30px) scale(0.9); }
  }
  @keyframes lb5 {
    0%   { transform: translate(-15px, -38px) scale(1.04); }
    16%  { transform: translate( 35px,  12px) scale(0.89); }
    32%  { transform: translate( -5px,  40px) scale(1.06); }
    48%  { transform: translate(-40px, -20px) scale(0.91); }
    64%  { transform: translate( 18px,  -8px) scale(1.09); }
    80%  { transform: translate( 25px,  32px) scale(0.88); }
    94%  { transform: translate(-28px,  10px) scale(1.03); }
    100% { transform: translate(-15px, -38px) scale(1.04); }
  }
  @keyframes lb6 {
    0%   { transform: translate( 38px,  -8px) scale(0.92); }
    13%  { transform: translate( -8px,  35px) scale(1.07); }
    29%  { transform: translate(-35px, -25px) scale(0.88); }
    44%  { transform: translate( 12px,  40px) scale(1.04); }
    59%  { transform: translate( 30px, -32px) scale(0.9); }
    74%  { transform: translate(-20px,  15px) scale(1.08); }
    89%  { transform: translate(  5px, -15px) scale(0.95); }
    100% { transform: translate( 38px,  -8px) scale(0.92); }
  }
  @keyframes lb7 {
    0%   { transform: translate(-20px,  25px) scale(1.05); }
    17%  { transform: translate( 28px, -30px) scale(0.87); }
    33%  { transform: translate(-38px,   8px) scale(1.09); }
    50%  { transform: translate( 15px,  38px) scale(0.91); }
    66%  { transform: translate( 35px, -15px) scale(1.03); }
    82%  { transform: translate(-12px, -40px) scale(0.89); }
    97%  { transform: translate( 22px,  18px) scale(1.06); }
    100% { transform: translate(-20px,  25px) scale(1.05); }
  }
  @keyframes tube-shake {
    0%,100% { transform: rotate(0deg) scaleX(1); }
    15%  { transform: rotate(-1.5deg) scaleX(0.985); }
    30%  { transform: rotate(1deg) scaleX(1.01); }
    45%  { transform: rotate(-0.8deg) scaleX(0.995); }
    70%  { transform: rotate(1.2deg) scaleX(1.005); }
  }
`;

/* ──────────────────────────────────────────────
   내부 공 컴포넌트
────────────────────────────────────────────── */
const MachineBall = ({ color, delay, animName, size = 38 }) => (
  <Box
    sx={{
      position: 'absolute',
      width: size, height: size,
      borderRadius: '50%',
      background: `
        radial-gradient(circle at 33% 30%, rgba(255,255,255,0.6) 0%, transparent 48%),
        radial-gradient(circle, ${color} 55%, ${color}bb 100%)
      `,
      boxShadow: `0 4px 14px ${color}77, inset 0 -3px 7px rgba(0,0,0,0.25)`,
      border: `1.5px solid ${color}cc`,
      animation: `${animName} ${(2.6 + delay * 0.38).toFixed(2)}s ${delay * 0.17}s ease-in-out infinite`,
    }}
  />
);

/* ──────────────────────────────────────────────
   로또 추첨 기계
────────────────────────────────────────────── */
const LottoMachine = ({ isDrawing }) => {
  const balls = [
    { color: '#f9ca24', animName: 'lb0' },
    { color: '#6ab04c', animName: 'lb1' },
    { color: '#e84393', animName: 'lb2' },
    { color: '#0652DD', animName: 'lb3' },
    { color: '#9b59b6', animName: 'lb4' },
    { color: '#f9ca24', animName: 'lb5' },
    { color: '#e84393', animName: 'lb6' },
    { color: '#0652DD', animName: 'lb7' },
  ];

  return (
    <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <style>{MACHINE_STYLES}</style>

      {/* 드럼 통 */}
      <Box
        sx={{
          position: 'relative',
          width: { xs: 160, sm: 190, md: 220 },
          height: { xs: 160, sm: 190, md: 220 },
          borderRadius: '50%',
          background: isDrawing
            ? 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.01) 60%), rgba(10,10,14,0.92)'
            : 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.01) 60%), rgba(10,10,14,0.85)',
          border: isDrawing
            ? '2px solid rgba(249,202,36,0.55)'
            : '2px solid rgba(255,255,255,0.08)',
          boxShadow: isDrawing
            ? '0 0 40px rgba(249,202,36,0.18), inset 0 0 50px rgba(0,0,0,0.5)'
            : '0 8px 40px rgba(0,0,0,0.6), inset 0 0 50px rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
          animation: isDrawing ? 'tube-shake 1.6s ease-in-out infinite' : 'none',
          transition: 'border-color 0.5s, box-shadow 0.5s',
        }}
      >
        {/* 유리 반사 */}
        <Box sx={{
          position: 'absolute', top: '10%', left: '15%',
          width: '30%', height: '22%',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        {/* 공들 */}
        {balls.map((b, i) => (
          <MachineBall
            key={i}
            color={b.color}
            delay={i}
            animName={isDrawing ? b.animName : b.animName}
            size={isDrawing ? 38 : 34}
          />
        ))}

        {/* 중앙 텍스트 */}
        {!isDrawing && (
          <Typography sx={{
            position: 'absolute', color: 'rgba(255,255,255,0.15)',
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: 2,
            textTransform: 'uppercase', zIndex: 10,
          }}>
            LOTTO
          </Typography>
        )}
        {isDrawing && (
          <Typography sx={{
            position: 'absolute', color: 'rgba(249,202,36,0.6)',
            fontSize: '0.6rem', fontWeight: 800, letterSpacing: 3,
            textTransform: 'uppercase', zIndex: 10,
            animation: 'none',
          }}>
            추첨 중
          </Typography>
        )}
      </Box>

      {/* 배출구 */}
      <Box sx={{
        width: { xs: 28, sm: 34, md: 40 },
        height: { xs: 18, sm: 22, md: 26 },
        background: 'linear-gradient(180deg, rgba(30,30,40,0.95) 0%, rgba(15,15,20,0.98) 100%)',
        border: isDrawing ? '1.5px solid rgba(249,202,36,0.4)' : '1.5px solid rgba(255,255,255,0.06)',
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        boxShadow: isDrawing ? '0 6px 20px rgba(249,202,36,0.12)' : '0 6px 16px rgba(0,0,0,0.5)',
        transition: 'border-color 0.5s, box-shadow 0.5s',
      }} />
    </Box>
  );
};

/* ──────────────────────────────────────────────
   로또 섹션 전체
────────────────────────────────────────────── */
const LottoSection = () => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [numbers, setNumbers] = useState([]);
  const [bonus, setBonus] = useState(null);
  const [visibleCount, setVisibleCount] = useState(0);

  const draw = () => {
    if (isDrawing) return;
    setNumbers([]);
    setBonus(null);
    setVisibleCount(0);
    setIsDrawing(true);

    setTimeout(() => {
      const pool = Array.from({ length: 45 }, (_, i) => i + 1);
      const shuffled = pool.sort(() => Math.random() - 0.5);
      const picked = shuffled.slice(0, 6).sort((a, b) => a - b);
      const bonusBall = shuffled[6];

      setNumbers(picked);
      setBonus(bonusBall);
      setIsDrawing(false);

      // 공 순차 등장
      picked.forEach((_, i) => {
        setTimeout(() => setVisibleCount(i + 1), i * 180);
      });
    }, 2800);
  };

  return (
    <Box
      sx={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: '#000',
        overflow: 'hidden',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        position: 'relative',
        px: { xs: 2, md: 0 },
      }}
    >
      <Container maxWidth="xl" sx={{ width: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: { xs: 6, md: 8 },
          }}
        >
          {/* 왼쪽: 설명 */}
          <Box sx={{ flex: '0 0 auto', width: { xs: '100%', md: '40%' } }}>
            <Chip
              label="🎰 Lucky Draw"
              sx={{
                mb: 2.5, bgcolor: 'rgba(249,202,36,0.08)', color: '#f9ca24',
                border: '1px solid rgba(249,202,36,0.22)', fontWeight: 700, fontSize: '0.76rem',
              }}
            />
            <Typography
              variant="h3" fontWeight={800}
              sx={{
                mb: 2, letterSpacing: '-1.5px', lineHeight: 1.15,
                fontSize: { xs: '1.8rem', md: '2.4rem' },
              }}
            >
              <span style={{ background: 'linear-gradient(to right,#fff,#d4d4d8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                오늘의 행운 번호를
              </span>
              <br />
              <span style={{ background: 'linear-gradient(135deg,#f9ca24,#f39c12)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                뽑아보세요
              </span>
            </Typography>
            <Typography sx={{ color: '#71717a', fontSize: '0.9rem', lineHeight: 1.7, mb: 4, maxWidth: 360 }}>
              순수 난수 기반 로또 번호 생성기입니다.
              단순한 행운의 유희로 즐겨보세요.
            </Typography>

            <Button
              variant="contained"
              onClick={draw}
              disabled={isDrawing}
              startIcon={<CasinoIcon />}
              sx={{
                px: 4, py: 1.6, borderRadius: '12px',
                bgcolor: isDrawing ? 'rgba(249,202,36,0.15)' : '#f9ca24',
                color: isDrawing ? '#f9ca24' : '#000',
                fontWeight: 800, fontSize: '0.95rem', textTransform: 'none',
                boxShadow: isDrawing ? 'none' : '0 0 24px rgba(249,202,36,0.3)',
                '&:hover:not(:disabled)': { bgcolor: '#f5bc00', transform: 'translateY(-2px)', boxShadow: '0 0 36px rgba(249,202,36,0.4)' },
                '&.Mui-disabled': { color: '#f9ca24' },
                transition: 'all 0.25s',
              }}
            >
              {isDrawing ? '추첨 중...' : numbers.length > 0 ? '다시 추첨' : '추첨하기'}
            </Button>
          </Box>

          {/* 오른쪽: 기계 + 결과 */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

            {/* ── 상단 카드: 기계 + 볼 행 (고정 크기) ── */}
            <Box
              sx={{
                borderRadius: '18px',
                p: '1px',
                background: isDrawing
                  ? 'linear-gradient(145deg, rgba(249,202,36,0.4) 0%, rgba(249,202,36,0.1) 50%, rgba(255,255,255,0.04) 100%)'
                  : 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                boxShadow: isDrawing
                  ? '0 0 40px rgba(249,202,36,0.12), 0 0 0 1px rgba(249,202,36,0.1)'
                  : '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
                transition: 'all 0.5s',
              }}
            >
              <Box
                sx={{
                  borderRadius: '17px',
                  bgcolor: '#0a0a0c',
                  p: { xs: 2, md: 2.5 },
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <LottoMachine isDrawing={isDrawing} />

                {/* ── 볼 한 줄: 6개 번호 + '+' + 보너스 ── */}
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={{ xs: 0.5, md: 0.7 }}
                  justifyContent="center"
                  sx={{ width: '100%' }}
                >
                  {numbers.length > 0
                    ? numbers.map((n, i) => (
                        <LottoBall key={i} number={n} visible={i < visibleCount} size={42} />
                      ))
                    : Array.from({ length: 6 }).map((_, i) => (
                        <Box key={i} sx={{
                          width: { xs: 34, md: 42 }, height: { xs: 34, md: 42 },
                          borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)',
                          border: '2px dashed rgba(255,255,255,0.08)', flexShrink: 0,
                        }} />
                      ))
                  }

                  {/* + 구분자 */}
                  <Typography sx={{
                    color: '#3f3f46', fontWeight: 700, fontSize: { xs: '0.95rem', md: '1.05rem' },
                    flexShrink: 0, px: 0.3,
                    opacity: visibleCount >= 6 ? 1 : 0.15, transition: 'opacity 0.4s',
                  }}>+</Typography>

                  {/* 보너스 볼 */}
                  {bonus && visibleCount >= 6 ? (
                    <Box sx={{
                      width: { xs: 34, md: 42 }, height: { xs: 34, md: 42 }, borderRadius: '50%',
                      background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.55) 0%, transparent 50%), radial-gradient(circle, ${getBallColor(bonus)} 60%, ${getBallColor(bonus)}cc 100%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 4px 14px ${getBallColor(bonus)}55`,
                      border: `2px solid ${getBallColor(bonus)}99`, flexShrink: 0,
                      transform: 'scale(1)', opacity: 1,
                      transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.38s ease',
                    }}>
                      <Typography sx={{ fontWeight: 900, fontSize: { xs: '0.72rem', md: '0.82rem' }, color: '#fff', textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>
                        {bonus}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{
                      width: { xs: 34, md: 42 }, height: { xs: 34, md: 42 },
                      borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)',
                      border: '2px dashed rgba(255,255,255,0.08)', flexShrink: 0,
                    }} />
                  )}
                </Stack>              </Box>
            </Box>

            {/* ── 하단 요약 카드 — 항상 노출 ── */}
            <Box
              sx={{
                p: { xs: 1.8, md: 2.2 },
                borderRadius: '14px',
                background: numbers.length > 0 && visibleCount >= 6
                  ? 'linear-gradient(135deg, rgba(249,202,36,0.06) 0%, rgba(0,0,0,0) 100%)'
                  : 'rgba(255,255,255,0.015)',
                border: numbers.length > 0 && visibleCount >= 6
                  ? '1px solid rgba(249,202,36,0.18)'
                  : '1px solid rgba(255,255,255,0.06)',
                transition: 'background 0.6s, border-color 0.6s',
              }}
            >
              {numbers.length === 0 || visibleCount < 6 ? (
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography sx={{ fontSize: '1.1rem' }}>
                    {isDrawing ? '🎲' : '🎰'}
                  </Typography>
                  <Box>
                    <Typography sx={{ color: '#a1a1aa', fontSize: '0.75rem', fontWeight: 600, mb: 0.2 }}>
                      {isDrawing ? '운명의 번호를 선택하는 중...' : '오늘의 행운을 시험해보세요'}
                    </Typography>
                    <Typography sx={{ color: '#52525b', fontSize: '0.68rem' }}>
                      {isDrawing ? '잠시만 기다려주세요 ✨' : '추첨하기 버튼을 눌러 번호를 뽑아보세요'}
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <>
                  <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                    <Typography sx={{ fontSize: '1rem' }}>🍀</Typography>
                    <Typography sx={{ color: '#f9ca24', fontSize: '0.78rem', fontWeight: 800, letterSpacing: 0.3 }}>
                      이번 주 행운의 번호
                    </Typography>
                    <Box sx={{ flex: 1 }} />
                    <Chip
                      label="Lucky"
                      size="small"
                      sx={{
                        height: 18, fontSize: '0.6rem', fontWeight: 700,
                        bgcolor: 'rgba(249,202,36,0.1)', color: '#f9ca24',
                        border: '1px solid rgba(249,202,36,0.2)',
                      }}
                    />
                  </Stack>
                  <Typography sx={{ color: '#d4d4d8', fontSize: '0.88rem', fontWeight: 700, mb: 0.6, letterSpacing: 0.5 }}>
                    {numbers.join('  ·  ')}
                    <span style={{ color: '#52525b', margin: '0 8px', fontWeight: 400 }}>+</span>
                    <span style={{ color: '#f9ca24' }}>{bonus}</span>
                  </Typography>
                  <Typography sx={{ color: '#52525b', fontSize: '0.68rem', lineHeight: 1.6 }}>
                    이 번호로 이번 주 행운이 찾아오길 바랍니다 ✨
                    <br />
                    <span style={{ color: '#3f3f46' }}>* 본 번호는 순수 재미용이며 실제 당첨을 보장하지 않습니다.</span>
                  </Typography>
                </>
              )}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};






/* ──────────────────────────────────────────────
   메인 페이지
────────────────────────────────────────────── */
const MainPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        width: '100%',
        height: '100dvh',
        bgcolor: '#000',
        color: '#fff',
        overflowX: 'hidden',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        scrollBehavior: 'smooth',
        /* 스크롤바 숨기기 */
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      <Helmet>
        <title>TerminalNexus | 코드 하나로 연결되는 터미널 스페이스</title>
        <meta
          name="description"
          content="브라우저에서 즉시 실행되는 완벽한 리눅스 터미널 환경. 클라우드 인프라와 개발자 커뮤니티가 결합된 새로운 차원의 플랫폼."
        />
      </Helmet>

      {/* ── HERO 섹션 — 첫 번째 스냅 ── */}
      <Box
        sx={{
          position: 'relative',
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          overflow: 'hidden',
          scrollSnapAlign: 'start',
          scrollSnapStop: 'always',
        }}
      >
        {/* 배경 글로우 */}
        <Box
          sx={{
            position: 'absolute', top: '15%', left: '40%',
            width: '60vw', height: '60vw', maxWidth: 800, maxHeight: 800,
            background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
            zIndex: 0, pointerEvents: 'none',
          }}
        />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: { xs: 5, md: 6 },
            }}
          >
            {/* 왼쪽 텍스트 */}
            <Box sx={{ flex: '0 0 auto', width: { xs: '100%', md: '42%' } }}>
              <Chip
                label={t('main.badge')}
                variant="outlined"
                sx={{
                  color: '#a855f7',
                  borderColor: 'rgba(168,85,247,0.3)',
                  mb: { xs: 3, md: 4 },
                  fontWeight: 600,
                  bgcolor: 'rgba(168,85,247,0.05)',
                  fontSize: { xs: '0.75rem', md: '0.8rem' },
                }}
              />

              <Typography
                variant="h1"
                fontWeight={800}
                sx={{
                  mb: 3,
                  fontSize: { xs: '2.2rem', sm: '2.8rem', md: '3.4rem', lg: '4rem' },
                  letterSpacing: '-2px',
                  lineHeight: 1.15,
                }}
              >
                <span style={{ background: 'linear-gradient(to right,#fff,#d4d4d8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'block' }}>코드 하나로</span>
                <span style={{ background: 'linear-gradient(to right,#fff,#d4d4d8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'block' }}>연결되는 무한한</span>
                <span style={{ background: 'linear-gradient(135deg,#818cf8,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'block' }}>터미널 스페이스</span>
              </Typography>

              <Typography
                sx={{
                  mb: 5, color: '#a1a1aa',
                  fontSize: { xs: '0.95rem', md: '1.05rem' },
                  lineHeight: 1.75, whiteSpace: 'pre-line',
                }}
              >
                {t('main.hero_desc')}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained" size="large"
                  onClick={() => navigate('/join')}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    px: { xs: 3, md: 4 }, py: 1.5,
                    fontSize: { xs: '0.95rem', md: '1rem' }, fontWeight: 700,
                    borderRadius: '12px', bgcolor: '#fff', color: '#000',
                    textTransform: 'none',
                    boxShadow: '0 0 20px rgba(255,255,255,0.18)',
                    '&:hover': { bgcolor: '#e4e4e7', transform: 'translateY(-2px)' },
                    transition: 'all 0.2s',
                  }}
                >
                  {t('main.start_free')}
                </Button>
                <Button
                  variant="outlined" size="large"
                  onClick={() => navigate('/guide')}
                  endIcon={<KeyboardCommandKeyIcon />}
                  sx={{
                    px: { xs: 3, md: 4 }, py: 1.5,
                    fontSize: { xs: '0.95rem', md: '1rem' }, fontWeight: 500,
                    borderRadius: '12px', color: '#fff',
                    borderColor: 'rgba(255,255,255,0.2)',
                    bgcolor: 'rgba(255,255,255,0.03)',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.45)',
                      bgcolor: 'rgba(255,255,255,0.07)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  {t('main.view_docs')}
                </Button>
              </Stack>

              <Stack
                direction="row"
                spacing={{ xs: 3, md: 4 }}
                mt={{ xs: 5, md: 6 }}
                divider={<Box sx={{ width: '1px', bgcolor: 'rgba(255,255,255,0.08)', alignSelf: 'stretch' }} />}
              >
                {[
                  { label: '활성 터미널', value: '1,200+' },
                  { label: '개발자', value: '5K+' },
                  { label: '가동률', value: '99.9%' },
                ].map((stat) => (
                  <Box key={stat.label}>
                    <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: { xs: '1.1rem', md: '1.3rem' }, lineHeight: 1 }}>
                      {stat.value}
                    </Typography>
                    <Typography sx={{ color: '#52525b', fontSize: '0.75rem', mt: 0.5 }}>
                      {stat.label}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>

            {/* 오른쪽 CLI 터미널 */}
            <Box sx={{ flex: 1, width: { xs: '100%', md: 'auto' }, minWidth: 0 }}>
              <Box
                sx={{
                  position: 'relative',
                  borderRadius: '18px',
                  p: '1px',
                  background: 'linear-gradient(145deg, rgba(99,102,241,0.35) 0%, rgba(168,85,247,0.15) 50%, rgba(255,255,255,0.04) 100%)',
                  boxShadow: '0 24px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)',
                }}
              >
                <Box
                  sx={{
                    borderRadius: '17px',
                    overflow: 'hidden',
                    bgcolor: '#0a0a0c',
                    minHeight: { xs: 280, sm: 340, md: 400 },
                  }}
                >
                  <TerminalHero />
                </Box>
              </Box>

              {!isMobile && (
                <Stack direction="row" spacing={1.5} mt={2} justifyContent="flex-end">
                  {['$ tn ssh prod-1', '실시간 연결', '암호화 보호'].map((label) => (
                    <Chip
                      key={label}
                      label={label}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.04)',
                        color: '#71717a',
                        border: '1px solid rgba(255,255,255,0.07)',
                        fontFamily: label.startsWith('$') ? 'monospace' : 'inherit',
                        fontSize: '0.7rem',
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* ── 로또 섹션 — 두 번째 스냅 ── */}
      <LottoSection />

    </Box>
  );
};

export default MainPage;
