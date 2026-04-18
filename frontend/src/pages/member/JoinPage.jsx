import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

const BACKEND_API_BASE_URL = '';

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
  '& .MuiFormHelperText-root': { color: '#71717a' },
  '& .MuiFormHelperText-root.Mui-error': { color: '#f87171' },
};

const successInput = {
  ...darkInput,
  '& .MuiOutlinedInput-root': {
    ...darkInput['& .MuiOutlinedInput-root'],
    '& fieldset': { borderColor: 'rgba(52,211,153,0.4)' },
  },
  '& .MuiFormHelperText-root': { color: '#34d399' },
};

const JoinPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ username: "", password: "", nickname: "", email: "" });
  const [validity, setValidity] = useState({ username: null, nickname: null });
  const [loading, setLoading] = useState({ username: false, nickname: false, submit: false });
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === "username" || name === "nickname") {
      setValidity(prev => ({ ...prev, [name]: null }));
    }
  };

  useEffect(() => {
    const { username } = formData;
    if (username.length < 4) { setValidity(prev => ({ ...prev, username: null })); return; }
    const check = async () => {
      setLoading(prev => ({ ...prev, username: true }));
      try {
        const res = await fetch(`${BACKEND_API_BASE_URL}/api/user/exist`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        if (res.ok) { const exists = await res.json(); setValidity(prev => ({ ...prev, username: !exists })); }
        else setValidity(prev => ({ ...prev, username: "server_error" }));
      } catch { setValidity(prev => ({ ...prev, username: "network_error" })); }
      finally { setLoading(prev => ({ ...prev, username: false })); }
    };
    const t = setTimeout(check, 500);
    return () => clearTimeout(t);
  }, [formData.username]);

  useEffect(() => {
    const { nickname } = formData;
    if (!nickname.trim()) { setValidity(prev => ({ ...prev, nickname: null })); return; }
    const check = async () => {
      setLoading(prev => ({ ...prev, nickname: true }));
      try {
        const res = await fetch(`${BACKEND_API_BASE_URL}/api/user/exist/nickname`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname }),
        });
        if (res.ok) { const exists = await res.json(); setValidity(prev => ({ ...prev, nickname: !exists })); }
        else setValidity(prev => ({ ...prev, nickname: "server_error" }));
      } catch { setValidity(prev => ({ ...prev, nickname: "network_error" })); }
      finally { setLoading(prev => ({ ...prev, nickname: false })); }
    };
    const t = setTimeout(check, 500);
    return () => clearTimeout(t);
  }, [formData.nickname]);

  const handleSignUp = async () => {
    const { username, password, nickname, email } = formData;
    if (username.length < 4 || password.length < 4 || !nickname || !email) {
      setErrorMsg("모든 항목을 입력해주세요. (ID/PW 4자 이상)"); return;
    }
    if (validity.username !== true || validity.nickname !== true) {
      setErrorMsg("아이디 또는 닉네임 중복 확인이 필요합니다."); return;
    }
    setLoading(prev => ({ ...prev, submit: true }));
    setErrorMsg("");
    try {
      const res = await fetch(`${BACKEND_API_BASE_URL}/api/user`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("회원가입 실패");
      alert("회원가입이 완료되었습니다!");
      navigate("/login");
    } catch {
      setErrorMsg("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(prev => ({ ...prev, submit: false }));
    }
  };

  const isError = (v) => v === false || v === "server_error" || v === "network_error";
  const isSubmitDisabled = loading.submit || validity.username !== true || validity.nickname !== true
    || formData.password.length < 4 || !formData.email;

  const getHelper = (field) => {
    if (field === 'username') {
      if (loading.username) return "확인 중...";
      if (formData.username.length > 0 && formData.username.length < 4) return "4자 이상 입력해주세요.";
      if (validity.username === true) return "✓ 사용 가능한 아이디입니다.";
      if (validity.username === false) return "이미 사용 중인 아이디입니다.";
    }
    if (field === 'nickname') {
      if (loading.nickname) return "확인 중...";
      if (validity.nickname === true) return "✓ 사용 가능한 닉네임입니다.";
      if (validity.nickname === false) return "이미 사용 중인 닉네임입니다.";
    }
    return "";
  };

  const getInputSx = (field) => {
    if (validity[field] === true) return successInput;
    if (isError(validity[field])) return {
      ...darkInput,
      '& .MuiOutlinedInput-root': {
        ...darkInput['& .MuiOutlinedInput-root'],
        '& fieldset': { borderColor: 'rgba(239,68,68,0.4)' },
      },
      '& .MuiFormHelperText-root': { color: '#f87171' },
    };
    return darkInput;
  };

  return (
    <>
      <Helmet>
        <title>회원가입 - TerminalNexus | 무료 계정 만들기</title>
        <meta name="description" content="TerminalNexus에 가입하고 브라우저 기반 터미널을 경험하세요." />
        <link rel="canonical" href="https://tnhub.kr/join" />
      </Helmet>

      <Box
        sx={{
          minHeight: '100vh', bgcolor: '#000',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* 배경 글로우 */}
        <Box sx={{
          position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
          width: '60vw', height: '60vw', maxWidth: 700, maxHeight: 700,
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1, py: 8 }}>
          {/* 헤더 */}
          <Box textAlign="center" mb={4}>
            <Typography
              onClick={() => navigate('/')}
              sx={{
                fontSize: '1.4rem', fontWeight: 900, color: '#fff',
                cursor: 'pointer', mb: 1, letterSpacing: '-0.5px',
                '&:hover': { color: '#a5b4fc' }, transition: 'color 0.2s',
              }}
            >
              TN
            </Typography>
            <Typography
              variant="h4" fontWeight={800}
              sx={{ color: '#f4f4f5', letterSpacing: '-1.5px', mb: 1, fontSize: { xs: '1.8rem', md: '2rem' } }}
            >
              계정 만들기
            </Typography>
            <Typography sx={{ color: '#71717a', fontSize: '0.9rem' }}>
              무료로 시작하고 언제든 업그레이드하세요
            </Typography>
          </Box>

          {/* 폼 카드 */}
          <Box
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
                fullWidth label="아이디" name="username"
                value={formData.username} onChange={handleChange}
                autoFocus autoComplete="username"
                error={isError(validity.username) || (formData.username.length > 0 && formData.username.length < 4)}
                helperText={getHelper('username')}
                InputProps={{ endAdornment: loading.username ? <CircularProgress size={18} sx={{ color: '#818cf8' }} /> : null }}
                sx={getInputSx('username')}
              />
              <TextField
                fullWidth label="비밀번호" name="password"
                type="password" value={formData.password} onChange={handleChange}
                autoComplete="new-password"
                helperText={formData.password.length > 0 && formData.password.length < 4 ? "4자 이상 입력해주세요." : ""}
                error={formData.password.length > 0 && formData.password.length < 4}
                sx={darkInput}
              />
              <TextField
                fullWidth label="닉네임" name="nickname"
                value={formData.nickname} onChange={handleChange}
                error={isError(validity.nickname)}
                helperText={getHelper('nickname')}
                InputProps={{ endAdornment: loading.nickname ? <CircularProgress size={18} sx={{ color: '#818cf8' }} /> : null }}
                sx={getInputSx('nickname')}
              />
              <TextField
                fullWidth label="이메일" name="email"
                type="email" value={formData.email} onChange={handleChange}
                autoComplete="email"
                sx={darkInput}
              />

              {errorMsg && (
                <Alert
                  severity="error"
                  sx={{
                    bgcolor: 'rgba(239,68,68,0.1)', color: '#fca5a5',
                    border: '1px solid rgba(239,68,68,0.2)',
                    '& .MuiAlert-icon': { color: '#f87171' },
                  }}
                >
                  {errorMsg}
                </Alert>
              )}

              <Button
                fullWidth variant="contained"
                onClick={handleSignUp}
                disabled={isSubmitDisabled}
                endIcon={!loading.submit && <ArrowForwardIcon />}
                sx={{
                  py: 1.6, borderRadius: '10px',
                  bgcolor: isSubmitDisabled ? 'rgba(255,255,255,0.06)' : '#fff',
                  color: isSubmitDisabled ? '#52525b' : '#000',
                  fontWeight: 700, fontSize: '0.95rem', textTransform: 'none',
                  boxShadow: isSubmitDisabled ? 'none' : '0 0 20px rgba(255,255,255,0.1)',
                  '&:hover:not(:disabled)': { bgcolor: '#e4e4e7', transform: 'translateY(-1px)' },
                  '&.Mui-disabled': { color: '#52525b' },
                  transition: 'all 0.2s',
                }}
              >
                {loading.submit ? <CircularProgress size={22} sx={{ color: '#818cf8' }} /> : "회원가입"}
              </Button>
            </Stack>

            <Box textAlign="center" mt={3}>
              <Typography component="span" sx={{ color: '#52525b', fontSize: '0.85rem' }}>
                이미 계정이 있으신가요?{' '}
              </Typography>
              <Typography
                component="span" onClick={() => navigate('/login')}
                sx={{ color: '#818cf8', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', '&:hover': { color: '#a5b4fc' } }}
              >
                로그인
              </Typography>
            </Box>
          </Box>

          {/* 보안 뱃지 */}
          <Stack direction="row" justifyContent="center" gap={1.5} mt={3} flexWrap="wrap">
            {['🔒 보안 연결', '⚡ 즉시 활성화', '🆓 무료 시작'].map(t => (
              <Chip key={t} label={t} size="small" sx={{
                bgcolor: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                color: '#52525b', fontSize: '0.7rem',
              }} />
            ))}
          </Stack>
        </Container>
      </Box>
    </>
  );
};

export default JoinPage;
