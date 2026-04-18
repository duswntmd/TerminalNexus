import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

const BACKEND_API_BASE_URL = '';

/* ── 공통 다크 인풋 스타일 ── */
const darkInput = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.04)',
    borderRadius: '12px',
    color: '#f4f4f5',
    height: 56,
    fontSize: '0.98rem',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
    '&.Mui-focused fieldset': { borderColor: '#818cf8' },
  },
  '& .MuiInputBase-input::placeholder': { color: '#52525b', opacity: 1 },
};

const FruitAIPage = () => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const exampleQuestions = [
    '비타민C가 많은 과일은?',
    '소화에 좋은 과일 추천해줘',
    '운동 후 먹으면 좋은 과일은?',
    '피부에 좋은 과일 알려줘',
    '면역력 강화에 도움되는 과일은?',
  ];

  const handleAsk = async () => {
    if (!question.trim()) { setError('질문을 입력해주세요.'); return; }
    setLoading(true);
    setError('');
    setAnswer(null);
    try {
      const res = await fetch(`${BACKEND_API_BASE_URL}/api/fruits/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error('AI 답변 생성 실패');
      setAnswer(await res.json());
    } catch {
      setError('AI 답변을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); }
  };

  return (
    <>
      <Helmet>
        <title>과일 효능 AI - TerminalNexus | Gemini AI 기반 과일 정보</title>
        <meta name="description" content="Gemini AI를 활용한 RAG 시스템으로 과일 효능에 대해 질문하고 정확한 답변을 받아보세요." />
        <link rel="canonical" href="https://tnhub.kr/fruit-ai" />
      </Helmet>

      <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff', overflowX: 'hidden', position: 'relative' }}>
        {/* 배경 글로우 */}
        <Box sx={{
          position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)',
          width: '70vw', height: '70vw', maxWidth: 800, maxHeight: 800,
          background: 'radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* ── 히어로 헤더 ── */}
        <Box sx={{ pt: { xs: 14, md: 18 }, pb: { xs: 8, md: 10 }, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Container maxWidth="md">
            <Chip
              label="Powered by Gemini AI · RAG System"
              sx={{
                mb: 3, bgcolor: 'rgba(52,211,153,0.07)', color: '#34d399',
                border: '1px solid rgba(52,211,153,0.22)', fontWeight: 700, fontSize: '0.78rem',
              }}
            />
            <Typography
              variant="h1" component="h1" fontWeight={800}
              sx={{
                fontSize: { xs: '2.2rem', md: '3.2rem' },
                letterSpacing: '-2px', lineHeight: 1.12, mb: 2.5,
              }}
            >
              <span style={{
                background: 'linear-gradient(to right, #fff 40%, #a1a1aa)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                🍎 과일 효능 AI
              </span>
            </Typography>
            <Typography sx={{ color: '#71717a', fontSize: { xs: '0.95rem', md: '1.05rem' }, lineHeight: 1.75, maxWidth: 560, mx: 'auto' }}>
              Gemini AI 기반 RAG 시스템으로 과일의 효능, 영양소, 건강 정보를 정확하게 알려드립니다.
            </Typography>
          </Container>
        </Box>

        <Container maxWidth="lg" sx={{ pb: 12, position: 'relative', zIndex: 1 }}>

          {/* ── 질문 입력 카드 ── */}
          <Box
            sx={{
              p: { xs: 3, md: 4 },
              mb: 4,
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.07)',
              bgcolor: 'rgba(255,255,255,0.02)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Typography sx={{ color: '#52525b', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', mb: 2.5 }}>
              무엇이 궁금하신가요?
            </Typography>

            <Box display="flex" gap={2} mb={3}>
              <TextField
                fullWidth
                placeholder="예: 비타민C가 많은 과일은 무엇인가요?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                variant="outlined"
                sx={darkInput}
              />
              <Button
                variant="contained"
                onClick={handleAsk}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={18} sx={{ color: '#818cf8' }} /> : <SearchIcon />}
                sx={{
                  minWidth: 130, height: 56, fontWeight: 700,
                  fontSize: '0.95rem', whiteSpace: 'nowrap', flexShrink: 0,
                  borderRadius: '12px', textTransform: 'none',
                  bgcolor: loading ? 'rgba(255,255,255,0.05)' : '#fff',
                  color: loading ? '#52525b' : '#000',
                  boxShadow: loading ? 'none' : '0 0 20px rgba(255,255,255,0.1)',
                  '&:hover:not(:disabled)': { bgcolor: '#e4e4e7', transform: 'translateY(-1px)' },
                  '&.Mui-disabled': { color: '#52525b' },
                  transition: 'all 0.2s',
                }}
              >
                {loading ? '생각 중...' : '질문하기'}
              </Button>
            </Box>

            {/* 예시 질문 */}
            <Box>
              <Typography sx={{ color: '#3f3f46', fontSize: '0.72rem', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', mb: 1.5 }}>
                예시 질문
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {exampleQuestions.map((example, i) => (
                  <Chip
                    key={i} label={example}
                    onClick={() => setQuestion(example)}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#a1a1aa', cursor: 'pointer', fontSize: '0.8rem',
                      '&:hover': { bgcolor: 'rgba(52,211,153,0.07)', borderColor: 'rgba(52,211,153,0.25)', color: '#34d399' },
                      transition: 'all 0.2s',
                    }}
                  />
                ))}
              </Stack>
            </Box>
          </Box>

          {/* 에러 */}
          {error && (
            <Box sx={{ p: 2.5, mb: 4, borderRadius: '12px', bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <Typography sx={{ color: '#fca5a5', fontSize: '0.9rem' }}>{error}</Typography>
            </Box>
          )}

          {/* ── AI 답변 ── */}
          {answer && (
            <Box
              sx={{
                p: { xs: 3, md: 4 }, mb: 4,
                borderRadius: '20px',
                border: '1px solid rgba(52,211,153,0.12)',
                bgcolor: 'rgba(52,211,153,0.03)',
              }}
            >
              {/* 제목 */}
              <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                <AutoAwesomeIcon sx={{ color: '#34d399', fontSize: '1.2rem' }} />
                <Typography fontWeight={700} sx={{ color: '#f4f4f5', fontSize: '1rem' }}>
                  AI 답변
                </Typography>
              </Stack>

              {/* 질문 */}
              <Box sx={{ p: 2, mb: 3, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Typography sx={{ color: '#52525b', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 0.8 }}>
                  질문
                </Typography>
                <Typography sx={{ color: '#e4e4e7', fontWeight: 600, fontSize: '0.95rem' }}>
                  {answer.question}
                </Typography>
              </Box>

              {/* 답변 본문 */}
              <Box sx={{ p: 3, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', mb: 4 }}>
                <Typography sx={{ color: '#d4d4d8', whiteSpace: 'pre-line', lineHeight: 1.85, fontSize: '0.95rem' }}>
                  {answer.answer}
                </Typography>
              </Box>

              {/* 관련 과일 */}
              {answer.relatedFruits && answer.relatedFruits.length > 0 && (
                <>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3 }} />
                  <Typography sx={{ color: '#52525b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, mb: 2.5 }}>
                    📚 참고한 과일 정보
                  </Typography>
                  <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
                    {answer.relatedFruits.map((fruit) => (
                      <Box
                        key={fruit.id}
                        sx={{
                          p: 3, borderRadius: '14px',
                          border: '1px solid rgba(255,255,255,0.07)',
                          bgcolor: 'rgba(255,255,255,0.02)',
                        }}
                      >
                        <Typography sx={{ color: '#34d399', fontWeight: 700, mb: 1.5, fontSize: '0.95rem' }}>
                          🍃 {fruit.name} ({fruit.englishName})
                        </Typography>
                        <Box mb={1.5}>
                          <Typography sx={{ color: '#52525b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>효능</Typography>
                          <Typography sx={{ color: '#a1a1aa', fontSize: '0.85rem', lineHeight: 1.7 }}>{fruit.benefits}</Typography>
                        </Box>
                        <Box mb={2}>
                          <Typography sx={{ color: '#52525b', fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, mb: 0.5 }}>영양소</Typography>
                          <Typography sx={{ color: '#a1a1aa', fontSize: '0.85rem', lineHeight: 1.7 }}>{fruit.nutrients}</Typography>
                        </Box>
                        <Stack direction="row" gap={1} flexWrap="wrap">
                          <Chip label={fruit.season} size="small" sx={{ bgcolor: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)', fontSize: '0.7rem' }} />
                          <Chip label={fruit.origin} size="small" sx={{ bgcolor: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.7rem' }} />
                        </Stack>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
            </Box>
          )}

          {/* ── RAG 설명 (초기 상태) ── */}
          {!answer && !loading && (
            <Box
              sx={{
                p: { xs: 3, md: 4 }, borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.06)',
                bgcolor: 'rgba(255,255,255,0.015)',
              }}
            >
              <Typography sx={{ color: '#818cf8', fontWeight: 700, mb: 2, fontSize: '0.95rem' }}>
                🤖 RAG 시스템이란?
              </Typography>
              <Typography sx={{ color: '#71717a', lineHeight: 1.8, fontSize: '0.9rem', mb: 1.5 }}>
                RAG(Retrieval-Augmented Generation)는 대규모 언어 모델(LLM)이 단독으로 답변하는 것이 아니라,{' '}
                <strong style={{ color: '#a1a1aa' }}>외부 데이터베이스에서 관련 정보를 먼저 검색</strong>하고 이를 활용해 더욱{' '}
                <strong style={{ color: '#a1a1aa' }}>정확하고 신뢰할 수 있는 답변</strong>을 생성하는 방식입니다.
              </Typography>
              <Typography sx={{ color: '#71717a', lineHeight: 1.8, fontSize: '0.9rem' }}>
                이 시스템은 과일 효능 데이터베이스에서 관련 정보를 검색한 후, Gemini AI가 해당 정보를 바탕으로 자연스럽고 이해하기 쉬운 답변을 생성합니다.
              </Typography>
            </Box>
          )}
        </Container>
      </Box>
    </>
  );
};

export default FruitAIPage;
