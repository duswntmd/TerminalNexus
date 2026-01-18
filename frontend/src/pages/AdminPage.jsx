import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    Container,
    Typography,
    Paper,
    Box,
    Grid,
    Card,
    CardContent,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import ArticleIcon from '@mui/icons-material/Article';
import ChatIcon from '@mui/icons-material/Chat';
import AppleIcon from '@mui/icons-material/Apple';

const AdminPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalPosts: 0,
        onlineUsers: 0,
        totalFruits: 0
    });

    useEffect(() => {
        // 관리자 권한 체크
        if (!user || user.role !== 'ROLE_ADMIN') {
            alert('관리자 권한이 필요합니다.');
            navigate('/');
            return;
        }

        // 통계 데이터 로드
        fetchStats();
    }, [user, navigate]);

    const fetchStats = async () => {
        try {
            // TODO: 실제 API 호출로 교체
            setStats({
                totalUsers: 150,
                totalPosts: 342,
                onlineUsers: 12,
                totalFruits: 50
            });
        } catch (error) {
            console.error('통계 조회 실패:', error);
        }
    };

    if (!user || user.role !== 'ROLE_ADMIN') {
        return null;
    }

    return (
        <>
            <Helmet>
                <title>관리자 페이지 - TerminalNexus</title>
                <meta name="robots" content="noindex, nofollow" />
            </Helmet>

            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom fontWeight="bold">
                    🛠️ 관리자 대시보드
                </Typography>

                {/* 통계 카드 */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: '#1976d2', color: 'white' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {stats.totalUsers}
                                        </Typography>
                                        <Typography variant="body2">
                                            총 사용자
                                        </Typography>
                                    </Box>
                                    <PeopleIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: '#388e3c', color: 'white' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {stats.totalPosts}
                                        </Typography>
                                        <Typography variant="body2">
                                            총 게시글
                                        </Typography>
                                    </Box>
                                    <ArticleIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: '#f57c00', color: 'white' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {stats.onlineUsers}
                                        </Typography>
                                        <Typography variant="body2">
                                            온라인 사용자
                                        </Typography>
                                    </Box>
                                    <ChatIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: '#d32f2f', color: 'white' }}>
                            <CardContent>
                                <Box display="flex" alignItems="center" justifyContent="space-between">
                                    <Box>
                                        <Typography variant="h4" fontWeight="bold">
                                            {stats.totalFruits}
                                        </Typography>
                                        <Typography variant="body2">
                                            과일 데이터
                                        </Typography>
                                    </Box>
                                    <AppleIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* 최근 활동 */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                        📊 시스템 상태
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                        <Chip label="서버 정상" color="success" sx={{ mr: 1 }} />
                        <Chip label="데이터베이스 연결됨" color="success" sx={{ mr: 1 }} />
                        <Chip label="WebSocket 활성" color="success" />
                    </Box>
                </Paper>

                {/* 관리 메뉴 */}
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom fontWeight="bold">
                        🔧 관리 메뉴
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Button 
                                variant="contained" 
                                fullWidth 
                                size="large"
                                onClick={() => alert('사용자 관리 기능 준비 중')}
                            >
                                사용자 관리
                            </Button>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Button 
                                variant="contained" 
                                fullWidth 
                                size="large"
                                color="success"
                                onClick={() => alert('게시글 관리 기능 준비 중')}
                            >
                                게시글 관리
                            </Button>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Button 
                                variant="contained" 
                                fullWidth 
                                size="large"
                                color="warning"
                                onClick={() => alert('채팅 관리 기능 준비 중')}
                            >
                                채팅 관리
                            </Button>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Button 
                                variant="contained" 
                                fullWidth 
                                size="large"
                                color="error"
                                onClick={() => alert('시스템 설정 기능 준비 중')}
                            >
                                시스템 설정
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>
            </Container>
        </>
    );
};

export default AdminPage;
