import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Stack,
  Divider,
  Alert,
} from '@mui/material';

const BACKEND_API_BASE_URL = '';
const OAUTH2_BASE_URL = 'http://localhost:8080';

/* ── 공통 다크 인풋 스타일 ── */
const darkInput = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.04)',
    borderRadius: '10px',
    color: '#f4f4f5',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
    '&.Mui-focused fieldset': { borderColor: '#818cf8' },
  },
  '& .MuiInputLabel-root': { color: '#71717a' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
};

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const location = useLocation();
  const from = location.state?.from?.pathname || new URLSearchParams(location.search).get('redirect') || "/";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("아이디와 비밀번호를 입력하세요.");
      return;
    }
    try {
      const res = await fetch(`${BACKEND_API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "로그인 실패");
      }
      const data = await res.json();
      login(data.accessToken, data.refreshToken);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "아이디 또는 비밀번호가 틀렸습니다.");
    }
  };

  const handleSocialLogin = (provider) => {
    window.location.href = `${OAUTH2_BASE_URL}/oauth2/authorization/${provider}`;
  };

  return (
    <>
      <Helmet>
        <title>로그인 - TerminalNexus</title>
        <meta name="description" content="TerminalNexus에 로그인하고 터미널 환경과 개발자 커뮤니티를 이용하세요." />
        <link rel="canonical" href="https://tnhub.kr/login" />
      </Helmet>

      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: '#000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 배경 글로우 */}
        <Box sx={{
          position: 'absolute', top: '30%', left: '50%',
          transform: 'translateX(-50%)',
          width: '60vw', height: '60vw', maxWidth: 700, maxHeight: 700,
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1, py: 8 }}>
          {/* 로고 */}
          <Box textAlign="center" mb={5}>
            <Typography
              onClick={() => navigate('/')}
              sx={{
                fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.5px',
                color: '#fff', cursor: 'pointer', mb: 1,
                '&:hover': { color: '#a5b4fc' },
                transition: 'color 0.2s',
              }}
            >
              TN
            </Typography>
            <Typography
              variant="h4" fontWeight={800}
              sx={{
                color: '#f4f4f5', letterSpacing: '-1.5px', mb: 1,
                fontSize: { xs: '1.8rem', md: '2rem' },
              }}
            >
              다시 오셨군요
            </Typography>
            <Typography sx={{ color: '#71717a', fontSize: '0.9rem' }}>
              계속하려면 로그인하세요
            </Typography>
          </Box>

          {/* 폼 */}
          <Box
            component="form"
            onSubmit={handleLogin}
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.07)',
              bgcolor: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="아이디"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                sx={darkInput}
              />
              <TextField
                fullWidth
                label="비밀번호"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                sx={darkInput}
              />

              {error && (
                <Alert
                  severity="error"
                  sx={{
                    bgcolor: 'rgba(239,68,68,0.1)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239,68,68,0.2)',
                    '& .MuiAlert-icon': { color: '#f87171' },
                  }}
                >
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  py: 1.6, borderRadius: '10px',
                  bgcolor: '#fff', color: '#000', fontWeight: 700,
                  fontSize: '0.95rem', textTransform: 'none',
                  boxShadow: '0 0 20px rgba(255,255,255,0.1)',
                  '&:hover': { bgcolor: '#e4e4e7', transform: 'translateY(-1px)' },
                  transition: 'all 0.2s',
                }}
              >
                계속
              </Button>
            </Stack>

            <Box textAlign="center" mt={3}>
              <Typography component="span" sx={{ color: '#52525b', fontSize: '0.85rem' }}>
                계정이 없으신가요?{' '}
              </Typography>
              <Typography
                component="span"
                onClick={() => navigate('/join')}
                sx={{
                  color: '#818cf8', fontSize: '0.85rem', fontWeight: 600,
                  cursor: 'pointer',
                  '&:hover': { color: '#a5b4fc' },
                }}
              >
                회원가입
              </Typography>
            </Box>
          </Box>

          {/* 구분선 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 3 }}>
            <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.07)' }} />
            <Typography sx={{ color: '#3f3f46', fontSize: '0.75rem' }}>또는</Typography>
            <Divider sx={{ flex: 1, borderColor: 'rgba(255,255,255,0.07)' }} />
          </Box>

          {/* 소셜 로그인 */}
          <Stack spacing={2}>
            <Button
              fullWidth variant="outlined"
              onClick={() => handleSocialLogin("google")}
              sx={{
                py: 1.5, borderRadius: '10px',
                borderColor: 'rgba(255,255,255,0.1)',
                color: '#e4e4e7', textTransform: 'none',
                bgcolor: 'rgba(255,255,255,0.03)',
                fontWeight: 500,
                '&:hover': { borderColor: 'rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              <Box component="span" mr={1.5} sx={{ fontSize: '1.1rem' }}>🔵</Box>
              Google로 계속하기
            </Button>
            <Button
              fullWidth variant="outlined"
              onClick={() => handleSocialLogin("naver")}
              sx={{
                py: 1.5, borderRadius: '10px',
                borderColor: 'rgba(255,255,255,0.1)',
                color: '#e4e4e7', textTransform: 'none',
                bgcolor: 'rgba(255,255,255,0.03)',
                fontWeight: 500,
                '&:hover': { borderColor: 'rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              <Box component="span" mr={1.5} sx={{ fontSize: '1.1rem' }}>🟢</Box>
              Naver로 계속하기
            </Button>
          </Stack>
        </Container>
      </Box>
    </>
  );
}

export default LoginPage;