import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
    Container,
    Typography,
    TextField,
    Button,
    Box,
    Paper,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Alert,
    Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LocalFloristIcon from '@mui/icons-material/LocalFlorist';

const BACKEND_API_BASE_URL = '';

const FruitAIPage = () => {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // 예시 질문들
    const exampleQuestions = [
        '비타민C가 많은 과일은?',
        '소화에 좋은 과일 추천해줘',
        '운동 후 먹으면 좋은 과일은?',
        '피부에 좋은 과일 알려줘',
        '면역력 강화에 도움되는 과일은?'
    ];

    const handleAsk = async () => {
        if (!question.trim()) {
            setError('질문을 입력해주세요.');
            return;
        }

        setLoading(true);
        setError('');
        setAnswer(null);

        try {
            const res = await fetch(`${BACKEND_API_BASE_URL}/api/fruits/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ question }),
            });

            if (!res.ok) {
                throw new Error('AI 답변 생성 실패');
            }

            const data = await res.json();
            setAnswer(data);
        } catch (err) {
            console.error('Error:', err);
            setError('AI 답변을 가져오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleExampleClick = (exampleQuestion) => {
        setQuestion(exampleQuestion);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAsk();
        }
    };

    return (
        <>
            <Helmet>
                <title>과일 효능 AI - TerminalNexus | Gemini AI 기반 과일 정보</title>
                <meta name="description" content="Gemini AI를 활용한 RAG 시스템으로 과일 효능에 대해 질문하고 정확한 답변을 받아보세요." />
                <meta name="keywords" content="과일 효능, AI, Gemini, RAG, 건강 정보, 영양소" />
                <link rel="canonical" href="https://tnhub.kr/fruit-ai" />
            </Helmet>

            <Container maxWidth="lg" sx={{ mt: 6, mb: 8 }}>
                {/* 헤더 */}
                <Box textAlign="center" mb={6}>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={2} mb={2}>
                        <LocalFloristIcon sx={{ fontSize: 48, color: 'primary.main' }} />
                        <Typography variant="h3" component="h1" fontWeight="900" color="primary">
                            과일 효능 AI
                        </Typography>
                        <AutoAwesomeIcon sx={{ fontSize: 48, color: 'secondary.main' }} />
                    </Box>
                    <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto' }}>
                        Gemini AI 기반 RAG 시스템으로 과일의 효능, 영양소, 건강 정보를 정확하게 알려드립니다.
                    </Typography>
                </Box>

                {/* 질문 입력 영역 */}
                <Paper elevation={3} sx={{ p: 4, mb: 4, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight="bold" mb={2}>
                        💬 무엇이 궁금하신가요?
                    </Typography>
                    
                    <Box display="flex" gap={2} mb={3}>
                        <TextField
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="예: 비타민C가 많은 과일은 무엇인가요?"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            onKeyPress={handleKeyPress}
                            variant="outlined"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    fontSize: '1.1rem',
                                }
                            }}
                        />
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleAsk}
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                            sx={{
                                minWidth: 120,
                                height: 'auto',
                                fontWeight: 'bold',
                                fontSize: '1.1rem'
                            }}
                        >
                            {loading ? '생각 중...' : '질문하기'}
                        </Button>
                    </Box>

                    {/* 예시 질문 */}
                    <Box>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                            💡 예시 질문:
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                            {exampleQuestions.map((example, index) => (
                                <Chip
                                    key={index}
                                    label={example}
                                    onClick={() => handleExampleClick(example)}
                                    variant="outlined"
                                    sx={{
                                        cursor: 'pointer',
                                        '&:hover': {
                                            bgcolor: 'primary.light',
                                            color: 'white',
                                            borderColor: 'primary.main'
                                        }
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>
                </Paper>

                {/* 에러 메시지 */}
                {error && (
                    <Alert severity="error" sx={{ mb: 4 }}>
                        {error}
                    </Alert>
                )}

                {/* AI 답변 영역 */}
                {answer && (
                    <Paper elevation={3} sx={{ p: 4, borderRadius: 3, bgcolor: '#f9fafb' }}>
                        <Box display="flex" alignItems="center" gap={1} mb={3}>
                            <AutoAwesomeIcon color="secondary" />
                            <Typography variant="h5" fontWeight="bold">
                                AI 답변
                            </Typography>
                        </Box>

                        {/* 질문 */}
                        <Box mb={3} p={2} bgcolor="white" borderRadius={2} border="1px solid #e0e0e0">
                            <Typography variant="body2" color="text.secondary" mb={0.5}>
                                질문:
                            </Typography>
                            <Typography variant="h6" fontWeight="500">
                                {answer.question}
                            </Typography>
                        </Box>

                        {/* 답변 */}
                        <Box mb={4} p={3} bgcolor="white" borderRadius={2} boxShadow={1}>
                            <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.8, fontSize: '1.05rem' }}>
                                {answer.answer}
                            </Typography>
                        </Box>

                        {/* 관련 과일 정보 */}
                        {answer.relatedFruits && answer.relatedFruits.length > 0 && (
                            <>
                                <Divider sx={{ my: 3 }} />
                                <Typography variant="h6" fontWeight="bold" mb={3}>
                                    📚 참고한 과일 정보
                                </Typography>
                                <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
                                    {answer.relatedFruits.map((fruit) => (
                                        <Card variant="outlined" sx={{ height: '100%' }} key={fruit.id}>
                                            <CardContent>
                                                <Typography variant="h6" fontWeight="bold" color="primary" gutterBottom>
                                                    {fruit.name} ({fruit.englishName})
                                                </Typography>
                                                <Box mb={2}>
                                                    <Typography variant="body2" color="text.secondary" fontWeight="bold">
                                                        효능:
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {fruit.benefits}
                                                    </Typography>
                                                </Box>
                                                <Box mb={2}>
                                                    <Typography variant="body2" color="text.secondary" fontWeight="bold">
                                                        영양소:
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        {fruit.nutrients}
                                                    </Typography>
                                                </Box>
                                                <Box display="flex" gap={1} flexWrap="wrap">
                                                    <Chip label={fruit.season} size="small" color="success" variant="outlined" />
                                                    <Chip label={fruit.origin} size="small" color="info" variant="outlined" />
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>
                            </>
                        )}
                    </Paper>
                )}

                {/* 설명 */}
                {!answer && !loading && (
                    <Paper elevation={1} sx={{ p: 4, bgcolor: '#f0f7ff', borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight="bold" mb={2} color="primary">
                            🤖 RAG 시스템이란?
                        </Typography>
                        <Typography variant="body1" paragraph sx={{ lineHeight: 1.8 }}>
                            RAG(Retrieval-Augmented Generation)는 대규모 언어 모델(LLM)이 단독으로 답변을 생성하는 것이 아니라, 
                            <strong> 외부 데이터베이스에서 관련 정보를 먼저 검색</strong>하고, 
                            이를 활용해 더욱 <strong>정확하고 신뢰할 수 있는 답변</strong>을 생성하는 방식입니다.
                        </Typography>
                        <Typography variant="body1" sx={{ lineHeight: 1.8 }}>
                            이 시스템은 과일 효능 데이터베이스에서 관련 정보를 검색한 후, 
                            Gemini AI가 해당 정보를 바탕으로 자연스럽고 이해하기 쉬운 답변을 생성합니다.
                        </Typography>
                    </Paper>
                )}
            </Container>
        </>
    );
};

export default FruitAIPage;
