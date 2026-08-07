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
        minHeight: 'calc(100dvh - 64px)',
        height: { xs: 'auto', md: 'calc(100dvh - 64px)' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: '#000',
        overflow: 'hidden',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        position: 'relative',
        py: { xs: 6, md: 0 },
        px: { xs: 2.5, md: 4 },
      }}
    >
      <Container maxWidth="xl" sx={{ width: '100%', maxWidth: '1400px !important' }}>
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
            <Typography sx={{ color: '#71717a', fontSize: '0.9rem', lineHeight: 1.7, mb: 3, maxWidth: 360 }}>
              순수 난수 기반 로또 번호 생성기입니다.
              단순한 행운의 유희로 즐겨보세요.
            </Typography>

            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                onClick={draw}
                disabled={isDrawing}
                startIcon={<CasinoIcon />}
                sx={{
                  px: 3, py: 1.6, borderRadius: '12px',
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
            </Stack>
          </Box>

          {/* 오른쪽: 기계 + 결과 */}
          <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>

            {/* ── 상단 카드: 기계 + 볼 행 ── */}
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
                </Stack>
              </Box>
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
   날씨 기상 코드 정보 매퍼
   ────────────────────────────────────────────── */
const getWeatherDetails = (code) => {
  switch (code) {
    case 0:
      return { text: '맑음', icon: '☀️', color: '#f39c12' };
    case 1:
      return { text: '대체로 맑음', icon: '🌤️', color: '#f1c40f' };
    case 2:
      return { text: '구름 조금', icon: '⛅', color: '#bdc3c7' };
    case 3:
      return { text: '흐림', icon: '☁️', color: '#95a5a6' };
    case 45:
    case 48:
      return { text: '안개', icon: '🌫️', color: '#7f8c8d' };
    case 51:
    case 53:
    case 55:
      return { text: '이슬비', icon: '🌦️', color: '#3498db' };
    case 61:
    case 63:
    case 65:
      return { text: '비', icon: '🌧️', color: '#2980b9' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { text: '눈', icon: '❄️', color: '#ecf0f1' };
    case 80:
    case 81:
    case 82:
      return { text: '소나기', icon: '🌧️', color: '#2980b9' };
    case 95:
    case 96:
    case 99:
      return { text: '뇌우', icon: '⚡', color: '#f39c12' };
    default:
      return { text: '맑음', icon: '☀️', color: '#f39c12' };
  }
};

/* ──────────────────────────────────────────────
   날씨 섹션 (구글 다크모드 날씨 스타일 클론)
   ────────────────────────────────────────────── */
const WeatherSection = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationName, setLocationName] = useState('위치 정보 확인 중...');
  const [weatherData, setWeatherData] = useState(null);
  const [activeTab, setActiveTab] = useState('temp'); // 'temp' | 'precip' | 'wind'

  // 단계별 실시간 로딩 진행 상태
  const [loadingStep, setLoadingStep] = useState(1);
  const [loadingStatus, setLoadingStatus] = useState('GPS 위치 권한 확인 중...');
  const [loadingSubText, setLoadingSubText] = useState('더 정밀한 지역 날씨를 제공하기 위해 브라우저의 위치 권한 허용 팝업을 확인해 주세요.');
  const [gpsCountdown, setGpsCountdown] = useState(5);

  const fetchWeather = async (lat = 37.5665, lon = 126.9780, isFallback = false, showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      if (showLoading) {
        setLoadingStep(3);
        setLoadingStatus('지역 구역 주소 분석 중...');
        setLoadingSubText('위도 및 경도 좌표를 기반으로 한글 행정구역 명칭(시/구/동)을 분석하고 있습니다.');
      }

      if (!isFallback) {
        try {
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const principal = geoData.principalSubdivision || '';
            const city = geoData.city || '';
            const locality = geoData.locality || '';
            let locName = '';
            if (locality) {
              locName = `${city} ${locality}`.trim();
            } else if (city) {
              locName = city;
            } else {
              locName = principal || '현재 위치';
            }
            setLocationName(locName || '현재 위치');
          }
        } catch (e) {
          console.error('Reverse geocoding failed', e);
        }
      } else {
        setLocationName('서울특별시 중구 (기본값)');
      }

      if (showLoading) {
        setLoadingStep(4);
        setLoadingStatus('실시간 기상 데이터 수신 중...');
        setLoadingSubText('기상청 관측 및 Open-Meteo 인공위성 서버로부터 온도, 풍속, 예보 데이터를 빌드 중입니다.');
      }

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) throw new Error('날씨 정보를 가져오는 데 실패했습니다.');
      const wData = await weatherRes.json();

      setWeatherData(wData);
    } catch (err) {
      console.error(err);
      setError(err.message || '날씨 정보를 불러오는 과정에서 오류가 발생했습니다.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchIpLocation = async () => {
    try {
      const res = await fetch('https://freeipapi.com/api/json');
      if (res.ok) {
        const data = await res.json();
        if (data.latitude && data.longitude) {
          return { lat: data.latitude, lon: data.longitude };
        }
      }
    } catch (e) {
      console.error('IP Geolocation failed', e);
    }
    return null;
  };

  const getPosition = async () => {
    setLoading(true);
    setLoadingStep(1);
    setLoadingStatus('GPS 위치 권한 확인 중...');
    setLoadingSubText('정밀한 지역 날씨 정보를 위해 브라우저 상단/좌측의 위치 권한 허용 팝업을 확인해 주세요.');
    setGpsCountdown(5);

    let countdownVal = 5;
    let timerCleared = false;

    const timer = setInterval(() => {
      countdownVal -= 1;
      if (countdownVal <= 0) {
        clearInterval(timer);
        timerCleared = true;
        triggerIpFallback('GPS 응답 제한시간(5초) 초과');
      } else {
        setGpsCountdown(countdownVal);
      }
    }, 1000);

    const triggerIpFallback = async (reason) => {
      if (timerCleared) return;
      clearInterval(timer);
      timerCleared = true;

      console.warn(`GPS Geolocation bypassed: ${reason}. IP fallback starting.`);
      setLoadingStep(2);
      setLoadingStatus('네트워크 IP 위치 검색 중...');
      setLoadingSubText('GPS 승인이 거부되었거나 시간 초과되었습니다. 네트워크 IP 주소 기반으로 위치를 검색합니다.');

      const ipPos = await fetchIpLocation();
      let currentLat = 37.5665;
      let currentLon = 126.9780;
      let isFallback = true;

      if (ipPos) {
        currentLat = ipPos.lat;
        currentLon = ipPos.lon;
        isFallback = false;
      }
      await fetchWeather(currentLat, currentLon, isFallback, true);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (timerCleared) return;
          clearInterval(timer);
          timerCleared = true;

          const { latitude, longitude } = position.coords;
          setLoadingStep(2);
          setLoadingStatus('기기 GPS 위치 좌표 분석 중...');
          setLoadingSubText('GPS 위경도 좌표 획득에 성공했습니다. 날씨 데이터 매핑을 준비합니다.');
          await fetchWeather(latitude, longitude, false, true);
        },
        async (err) => {
          triggerIpFallback(err.message || '사용자가 GPS 권한 거절');
        },
        { timeout: 5000 }
      );
    } else {
      triggerIpFallback('브라우저 Geolocation 기능 미지원');
    }
  };

  useEffect(() => {
    getPosition();
  }, []);

  if (error && !weatherData) {
    return (
      <Box sx={{
        height: '100dvh', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', bgcolor: '#000',
        scrollSnapAlign: 'start', scrollSnapStop: 'always',
      }}>
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        <Button variant="outlined" onClick={getPosition} sx={{ color: '#fff', borderColor: '#fff' }}>다시 시도</Button>
      </Box>
    );
  }

  if (loading || !weatherData) {
    // 진행바 퍼센트 계산
    const progressPercent = loadingStep * 25;

    return (
      <Box sx={{
        height: 'calc(100dvh - 64px)', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', bgcolor: '#000',
        scrollSnapAlign: 'start', scrollSnapStop: 'always',
      }}>
        <Box sx={{
          width: '100%',
          maxWidth: 1400,
          p: { xs: 3, md: 5 },
          borderRadius: '20px',
          bgcolor: 'rgba(30,31,34,0.95)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '450px'
        }}>
          {/* 뒤에 번지는 은은한 그라데이션 백그라운드 글로우 */}
          <Box sx={{
            position: 'absolute',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            top: '20%',
            filter: 'blur(20px)',
            zIndex: 0,
            pointerEvents: 'none'
          }} />

          {/* 날씨 로딩 스피너 및 정보 안내 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5, mb: 4, zIndex: 2, width: '100%' }}>
            {/* 회전 + 맥박 글로우 효과가 추가된 이모지 */}
            <Box className="loading-weather-icon-premium" sx={{ 
              fontSize: '4.2rem', 
              animation: 'spin-slow 8s linear infinite, pulse-glow 2.5s ease-in-out infinite', 
              userSelect: 'none',
              mb: 1
            }}>
              🌤️
            </Box>

            {/* 단계별 상태 헤드라인 (key가 바뀔 때 페이드인 적용) */}
            <Typography 
              key={loadingStep}
              variant="h6" 
              sx={{ 
                color: '#fff', 
                fontWeight: 700, 
                letterSpacing: '-0.5px', 
                textAlign: 'center',
                animation: 'fade-in-up 0.5s ease-out forwards',
                fontSize: { xs: '1.1rem', md: '1.25rem' }
              }}
            >
              {loadingStatus}
            </Typography>

            {/* 단계별 상세 안내 텍스트 */}
            <Typography 
              key={`sub-${loadingStep}`}
              sx={{ 
                color: '#a1a1aa', 
                fontSize: '0.88rem', 
                textAlign: 'center', 
                maxWidth: '480px', 
                lineHeight: 1.6,
                minHeight: '45px', // 높이 고정으로 텍스트 변경 시 레이아웃 튀는 것 방지
                animation: 'fade-in-up 0.6s ease-out forwards'
              }}
            >
              {loadingSubText}
            </Typography>

            {/* 1단계 GPS 권한 대기 시에만 노출되는 카운트다운 타이머 */}
            {loadingStep === 1 && (
              <Typography 
                sx={{ 
                  color: '#fb923c', 
                  fontSize: '0.85rem', 
                  fontWeight: 600,
                  animation: 'pulse-blink 1.2s infinite ease-in-out',
                  mt: -1
                }}
              >
                (대기 시간 단축을 위해 권한을 허용해 주세요. {gpsCountdown}초 후 자동 IP 탐색 전환)
              </Typography>
            )}

            {/* 스텝 인디케이터 도트 */}
            <Stack direction="row" spacing={1.5} sx={{ mt: 1.5, mb: 0.5 }}>
              {[1, 2, 3, 4].map((stepNum) => {
                const isActive = stepNum <= loadingStep;
                const isCurrent = stepNum === loadingStep;
                return (
                  <Box 
                    key={stepNum} 
                    sx={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      bgcolor: isCurrent ? '#a855f7' : isActive ? 'rgba(168,85,247,0.5)' : 'rgba(255,255,255,0.1)',
                      boxShadow: isCurrent ? '0 0 10px #a855f7' : 'none',
                      transition: 'all 0.4s ease',
                      transform: isCurrent ? 'scale(1.3)' : 'scale(1)'
                    }}
                  />
                );
              })}
            </Stack>

            {/* 인터랙티브 프로그레스 바 */}
            <Box className="loading-bar-container" sx={{ 
              width: '260px', 
              height: '6px', 
              bgcolor: 'rgba(255,255,255,0.06)', 
              borderRadius: '3px', 
              overflow: 'hidden', 
              mt: 1.5,
              position: 'relative'
            }}>
              <Box className="loading-bar-fill-premium" sx={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #f39c12 0%, #a855f7 50%, #6366f1 100%)',
                borderRadius: '3px',
                transition: 'width 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '0 0 8px rgba(168,85,247,0.6)'
              }} />
            </Box>
          </Box>

          {/* 배경 스켈레톤 레이아웃 힌트 (배경감 조성) */}
          <Stack spacing={2.5} sx={{ width: '100%', opacity: 0.15, pointerEvents: 'none' }}>
            <Box sx={{ width: 150, height: 28, bgcolor: 'rgba(255,255,255,0.06)', borderRadius: '4px' }} />
            <Box sx={{ width: '100%', height: 180, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '12px' }} />
          </Stack>

          <style>{`
            @keyframes spin-slow {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes pulse-glow {
              0% { transform: scale(1); filter: drop-shadow(0 0 12px rgba(243, 156, 18, 0.3)); }
              50% { transform: scale(1.08); filter: drop-shadow(0 0 28px rgba(243, 156, 18, 0.65)); }
              100% { transform: scale(1); filter: drop-shadow(0 0 12px rgba(243, 156, 18, 0.3)); }
            }
            @keyframes fade-in-up {
              0% { opacity: 0; transform: translateY(10px); }
              100% { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse-blink {
              0% { opacity: 0.4; }
              50% { opacity: 1; }
              100% { opacity: 0.4; }
            }
          `}</style>
        </Box>
      </Box>
    );
  }

  const current = weatherData.current;
  const weatherDetails = getWeatherDetails(current.weather_code);

  const hourly = weatherData.hourly;
  const hourlyPoints = [];
  for (let i = 0; i < 24; i += 3) {
    if (hourly.temperature_2m[i] !== undefined) {
      hourlyPoints.push({
        time: `${(i + 9) % 24 === 0 ? '오전' : (i + 9) % 24 < 12 ? '오전' : '오후'} ${(i + 9) % 12 === 0 ? 12 : (i + 9) % 12}시`,
        temp: Math.round(hourly.temperature_2m[i]),
        precip: Math.round(hourly.precipitation_probability[i]),
        wind: Math.round(hourly.wind_speed_10m[i]),
        code: hourly.weather_code[i]
      });
    }
  }

  const chartValues = hourlyPoints.map(p => {
    if (activeTab === 'temp') return p.temp;
    if (activeTab === 'precip') return p.precip;
    return p.wind;
  });

  const valMin = Math.min(...chartValues);
  const valMax = Math.max(...chartValues);
  const valDiff = valMax - valMin === 0 ? 1 : valMax - valMin;

  const width = 1200;
  const height = 100;
  const paddingX = 40;
  const paddingY = 20;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const svgPoints = hourlyPoints.map((p, i) => {
    const val = activeTab === 'temp' ? p.temp : activeTab === 'precip' ? p.precip : p.wind;
    const x = paddingX + (i / (hourlyPoints.length - 1)) * chartWidth;
    const y = height - paddingY - ((val - valMin) / valDiff) * chartHeight;
    return { x, y, val };
  });

  let linePath = '';
  let areaPath = '';
  if (svgPoints.length > 0) {
    linePath = `M ${svgPoints[0].x} ${svgPoints[0].y} ` + svgPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    areaPath = `${linePath} L ${svgPoints[svgPoints.length - 1].x} ${height} L ${svgPoints[0].x} ${height} Z`;
  }

  const daily = weatherData.daily;
  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
  const todayIndex = new Date().getDay();

  const dailyForecast = [];
  for (let i = 0; i < 7; i++) {
    const dayName = i === 0 ? '오늘' : daysOfWeek[(todayIndex + i) % 7];
    dailyForecast.push({
      day: dayName,
      max: Math.round(daily.temperature_2m_max[i]),
      min: Math.round(daily.temperature_2m_min[i]),
      code: daily.weather_code[i]
    });
  }

  const getThemeColors = () => {
    if (activeTab === 'temp') return { stroke: '#f39c12', fill: 'rgba(243, 156, 18, 0.15)' };
    if (activeTab === 'precip') return { stroke: '#3498db', fill: 'rgba(52, 152, 219, 0.15)' };
    return { stroke: '#2ecc71', fill: 'rgba(46, 204, 113, 0.15)' };
  };
  const themeColors = getThemeColors();

  return (
    <Box
      sx={{
        minHeight: 'calc(100dvh - 64px)',
        height: { xs: 'auto', md: 'calc(100dvh - 64px)' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: '#000',
        overflow: 'hidden',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        position: 'relative',
        py: { xs: 6, md: 0 },
        px: { xs: 2.5, md: 4 },
      }}
    >
      <Container maxWidth="xl" sx={{ width: '100%', maxWidth: '1400px !important' }}>
        <Box
          sx={{
            borderRadius: '20px',
            background: 'linear-gradient(145deg, rgba(30,31,34,0.95) 0%, rgba(20,20,22,0.98) 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            p: { xs: 2.5, sm: 4 },
            color: '#e3e3e3',
          }}
        >
          {/* 상단 1: 위치 및 정확한 위치 사용 */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              📍 {locationName}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={getPosition}
              sx={{
                borderRadius: '20px',
                borderColor: 'rgba(255,255,255,0.15)',
                color: '#aaa',
                fontSize: '0.75rem',
                textTransform: 'none',
                px: 2,
                '&:hover': { borderColor: 'rgba(255,255,255,0.4)', color: '#fff', bgcolor: 'rgba(255,255,255,0.03)' }
              }}
            >
              정확한 위치 사용
            </Button>
          </Stack>

          {/* 상단 2: 메인 날씨 정보 카드 */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3, gap: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2.5}>
              <Typography sx={{ fontSize: '4rem', fontWeight: 300, lineHeight: 1, color: '#fff', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '4.5rem', marginRight: '8px' }}>{weatherDetails.icon}</span>
                {Math.round(current?.temperature_2m ?? 0)}
                <span style={{ fontSize: '1.8rem', fontWeight: 400, marginLeft: '2px', color: '#888' }}>°C</span>
              </Typography>
              <Box sx={{ borderLeft: '1px solid rgba(255,255,255,0.15)', pl: 2.5 }}>
                <Typography sx={{ fontSize: '0.85rem', color: '#aaa', mb: 0.5 }}>강수확률: {hourlyPoints[0]?.precip ?? 0}%</Typography>
                <Typography sx={{ fontSize: '0.85rem', color: '#aaa', mb: 0.5 }}>습도: {current?.relative_humidity_2m ?? 0}%</Typography>
                <Typography sx={{ fontSize: '0.85rem', color: '#aaa' }}>풍속: {current?.wind_speed_10m ?? 0} m/s</Typography>
              </Box>
            </Stack>

            <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Typography sx={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', mb: 0.5, letterSpacing: '-0.5px' }}>
                날씨
              </Typography>
              <Typography sx={{ fontSize: '0.9rem', color: '#888', mb: 0.5 }}>
                {new Date().toLocaleDateString('ko-KR', { weekday: 'long' })} 오후 {new Date().getHours()}:00
              </Typography>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: weatherDetails.color }}>
                {weatherDetails.text}
              </Typography>
            </Box>
          </Box>

          {/* 탭 전환 영역 */}
          <Stack direction="row" spacing={1} mb={2.5} sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', pb: 1 }}>
            {[
              { id: 'temp', label: '기온' },
              { id: 'precip', label: '강수확률' },
              { id: 'wind', label: '바람' }
            ].map(tab => (
              <Button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                sx={{
                  color: activeTab === tab.id ? '#fff' : '#777',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  fontSize: '0.9rem',
                  px: 2,
                  py: 0.5,
                  minWidth: 'auto',
                  position: 'relative',
                  textTransform: 'none',
                  '&::after': activeTab === tab.id ? {
                    content: '""',
                    position: 'absolute',
                    bottom: -9,
                    left: 0,
                    width: '100%',
                    height: '2px',
                    bgcolor: themeColors.stroke,
                  } : {},
                  '&:hover': { color: '#fff', bgcolor: 'transparent' }
                }}
              >
                {tab.label}
              </Button>
            ))}
          </Stack>

          {/* 시간별 차트 영역 */}
          <Box sx={{ position: 'relative', mb: 4, bgcolor: 'rgba(255,255,255,0.01)', borderRadius: '12px', p: 1.5 }}>
            <Box sx={{ width: '100%', overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
              <Box sx={{ minWidth: 1200, position: 'relative', height: 160 }}>
                <svg width="100%" height={height} style={{ overflow: 'visible', position: 'absolute', top: 20, left: 0 }}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={themeColors.stroke} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={themeColors.stroke} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#chartGrad)" />
                  <path d={linePath} fill="none" stroke={themeColors.stroke} strokeWidth="2.5" />
                  {svgPoints.map((p, i) => (
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke={themeColors.stroke} strokeWidth="2" />
                      <text
                        x={p.x}
                        y={p.y - 10}
                        textAnchor="middle"
                        fill="#fff"
                        style={{ fontSize: '0.8rem', fontWeight: 700 }}
                      >
                        {p.val}{activeTab === 'temp' ? '°' : activeTab === 'precip' ? '%' : 'm/s'}
                      </text>
                    </g>
                  ))}
                </svg>

                <Stack direction="row" justifyContent="space-between" sx={{ position: 'absolute', bottom: 5, width: '100%', px: `${paddingX}px` }}>
                  {hourlyPoints.map((p, i) => (
                    <Box key={i} sx={{ textAlign: 'center', width: 45, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', color: '#888', marginBottom: '4px' }}>{p.time}</span>
                      <span style={{ fontSize: '1.1rem' }}>{getWeatherDetails(p.code).icon}</span>
                    </Box>
                  ))}
                </Stack>
              </Box>
            </Box>
          </Box>

          {/* 주간 예보 */}
          <Box sx={{ width: '100%', overflowX: 'auto', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
            <Stack direction="row" spacing={1.5} sx={{ minWidth: 1200, pb: 0.5 }}>
              {dailyForecast.map((d, i) => {
                const det = getWeatherDetails(d.code);
                return (
                  <Box
                    key={i}
                    sx={{
                      flex: '1 0 0',
                      bgcolor: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '12px',
                      p: 1.5,
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.8,
                      minWidth: 70,
                      transition: 'transform 0.2s',
                      '&:hover': { transform: 'translateY(-2px)', bgcolor: 'rgba(255,255,255,0.04)' }
                    }}
                  >
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600, color: i === 0 ? '#fff' : '#aaa' }}>
                      {d.day}
                    </Typography>
                    <Typography sx={{ fontSize: '1.7rem', lineHeight: 1 }}>{det.icon}</Typography>
                    <Typography sx={{ fontSize: '0.72rem', color: '#777', fontWeight: 500 }}>{det.text}</Typography>
                    <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, mt: 0.5 }}>
                      {d.max}° <span style={{ color: '#555', fontWeight: 400 }}>{d.min}°</span>
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

/* ──────────────────────────────────────────────
   주식 시뮬레이터 섹션
────────────────────────────────────────────── */
const StockSection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stockList, setStockList] = useState([]);

  useEffect(() => {
    const fetchTopStocks = async () => {
      try {
        const res = await fetch('/api/stock/prices');
        if (res.ok) {
          const data = await res.json();
          setStockList(data.slice(0, 3));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchTopStocks();
    const interval = setInterval(fetchTopStocks, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        minHeight: 'calc(100dvh - 64px)',
        height: { xs: 'auto', md: 'calc(100dvh - 64px)' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: '#08090d',
        overflow: 'hidden',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        position: 'relative',
        py: { xs: 6, md: 0 },
        px: { xs: 2.5, md: 4 },
      }}
    >
      <Box
        sx={{
          position: 'absolute', top: '20%', left: '30%',
          width: '50vw', height: '50vw', maxWidth: 700, maxHeight: 700,
          background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, maxWidth: '1400px !important' }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: 'center',
            gap: { xs: 4, md: 8 },
          }}
        >
          <Box sx={{ flex: '0 0 auto', width: { xs: '100%', md: '45%' } }}>
            <Chip
              label={t('main.stock_badge')}
              sx={{
                mb: 2.5, bgcolor: 'rgba(56,189,248,0.08)', color: '#38bdf8',
                border: '1px solid rgba(56,189,248,0.25)', fontWeight: 800, fontSize: { xs: '0.72rem', md: '0.78rem' },
              }}
            />
            <Typography
              variant="h2" fontWeight={800}
              sx={{
                mb: 2, letterSpacing: '-1.5px', lineHeight: 1.15,
                fontSize: { xs: '1.8rem', sm: '2.4rem', md: '2.8rem' },
              }}
            >
              <span style={{ background: 'linear-gradient(to right,#fff,#d4d4d8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'block' }}>
                {t('main.stock_title_1')}
              </span>
              <span style={{ background: 'linear-gradient(135deg,#38bdf8,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'block' }}>
                {t('main.stock_title_2')}
              </span>
            </Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: { xs: '0.88rem', md: '0.95rem' }, lineHeight: 1.7, mb: 4, maxWidth: 420 }}>
              {t('main.stock_desc')}
            </Typography>

            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                onClick={() => navigate('/play/stock')}
                sx={{
                  px: { xs: 3, md: 4 }, py: 1.8, borderRadius: '14px',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #6366f1 100%)',
                  color: '#fff', fontWeight: 800, fontSize: { xs: '0.95rem', md: '1.05rem' }, textTransform: 'none',
                  boxShadow: '0 8px 24px rgba(56,189,248,0.3)',
                  '&:hover': { background: 'linear-gradient(135deg, #0284c7 0%, #4f46e5 100%)', transform: 'translateY(-2px)' },
                  transition: 'all 0.25s',
                }}
              >
                {t('main.stock_btn')}
              </Button>
            </Stack>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0, width: { xs: '100%', md: 'auto' } }}>
            <Box
              sx={{
                background: 'rgba(15, 17, 26, 0.9)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                p: { xs: 2, sm: 3, md: 3.5 },
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              }}
            >
              <Typography sx={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.9rem', mb: 2 }}>
                {t('main.stock_card_title')}
              </Typography>

              <Stack spacing={1.5}>
                {stockList.length > 0 ? stockList.map(stock => {
                  const isUp = stock.changeAmount >= 0;
                  return (
                    <Box
                      key={stock.ticker}
                      sx={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        p: { xs: 1.5, sm: 2 }, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.04)'
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 800, fontSize: { xs: '0.85rem', sm: '0.95rem' }, color: '#fff' }}>
                          {stock.name} ({stock.ticker})
                        </Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: '#64748b' }}>
                          {t('main.stock_card_sub')}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontWeight: 900, fontFamily: 'monospace', fontSize: { xs: '0.95rem', sm: '1.1rem' }, color: isUp ? '#ef4444' : '#3b82f6' }}>
                          {stock.currentPrice.toLocaleString()}원
                        </Typography>
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: isUp ? '#ef4444' : '#3b82f6' }}>
                          {isUp ? '▲' : '▼'} {Math.abs(stock.changeRate)}%
                        </Typography>
                      </Box>
                    </Box>
                  );
                }) : (
                  <Typography sx={{ color: '#64748b', py: 4, textAlign: 'center' }}>
                    {t('main.stock_receiving')}
                  </Typography>
                )}
              </Stack>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

const MainPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        width: '100%',
        height: 'calc(100dvh - 64px)',
        bgcolor: '#000',
        color: '#fff',
        overflowX: 'hidden',
        overflowY: 'scroll',
        scrollSnapType: 'y mandatory',
        scrollBehavior: 'smooth',
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

      {/* ── 1번 섹션: 주식 시뮬레이터 ── */}
      <StockSection />

      {/* ── 2번 섹션: 로또 추첨기 ── */}
      <LottoSection />

      {/* ── 3번 섹션: 날씨 정보 ── */}
      <WeatherSection />

      {/* ── 4번 섹션: CLI 터미널 단독 섹션 ── */}
      <Box
        sx={{
          position: 'relative',
          minHeight: 'calc(100dvh - 64px)',
          height: { xs: 'auto', md: 'calc(100dvh - 64px)' },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          scrollSnapAlign: 'start',
          scrollSnapStop: 'always',
          py: { xs: 6, md: 0 },
          px: { xs: 2.5, md: 4 },
        }}
      >
        {/* 배경 글로우 */}
        <Box
          sx={{
            position: 'absolute', top: '20%', left: '30%',
            width: '60vw', height: '60vw', maxWidth: 800, maxHeight: 800,
            background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
            zIndex: 0, pointerEvents: 'none',
          }}
        />

        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '1400px !important' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '100%',
            }}
          >
            <Chip
              label={t('main.cli_badge')}
              sx={{
                mb: 3, bgcolor: 'rgba(99,102,241,0.1)', color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.25)', fontWeight: 800, fontSize: { xs: '0.75rem', md: '0.8rem' },
              }}
            />

            {/* CLI 터미널 단독 대형 뷰 */}
            <Box sx={{ width: '100%', maxWidth: 960 }}>
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
                    minHeight: { xs: 320, sm: 400, md: 460 },
                  }}
                >
                  <TerminalHero />
                </Box>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default MainPage;
