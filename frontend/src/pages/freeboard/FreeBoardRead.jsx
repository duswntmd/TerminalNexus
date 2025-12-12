import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWithAccess } from '../../util/fetchUtil';
import {
    Container,
    Typography,
    Box,
    Paper,
    Button,
    Divider,
    Stack,
    Chip,
    Avatar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ListIcon from '@mui/icons-material/List';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Toast UI Viewer
import { Viewer } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const FreeBoardRead = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}`, { method: 'GET' });
                if (res.ok) {
                    setPost(await res.json());
                } else {
                    alert("Could not load post");
                    navigate('/freeboard');
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchPost();
    }, [id, navigate]);

    const handleDelete = async () => {
        if (!window.confirm("정말로 삭제하시겠습니까?")) return;
        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}`, { method: 'DELETE' });
            if (res.ok) {
                navigate('/freeboard');
            } else {
                alert("삭제 권한이 없거나 실패했습니다.");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleLike = async () => {
        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}/like`, { method: 'POST' });
            if(res.ok) {
                const result = await res.json();
                setPost(prev => ({
                    ...prev, 
                    isLiked: result.isLiked,
                    likeCount: result.isLiked ? prev.likeCount + 1 : prev.likeCount - 1
                }));
            } else {
                alert("로그인이 필요합니다.");
            }
        } catch(e) { console.error(e); }
    };

    if (!post) return <Container sx={{ mt: 4 }}>Loading...</Container>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 4, minHeight: '600px' }}>
                {/* Header */}
                <Typography variant="h4" fontWeight="bold" gutterBottom component="h1">
                    {post.title}
                </Typography>
                
                <Stack 
                    direction="row" 
                    spacing={2} 
                    alignItems="center" 
                    sx={{ color: 'text.secondary', mb: 3 }}
                    divider={<Divider orientation="vertical" flexItem />}
                >
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                            <PersonIcon fontSize="small" />
                        </Avatar>
                        <Typography variant="body2">{post.writerNickname}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <AccessTimeIcon fontSize="small" />
                        <Typography variant="body2">{new Date(post.regDate).toLocaleString()}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <VisibilityIcon fontSize="small" />
                        <Typography variant="body2">{post.viewCount}</Typography>
                    </Stack>
                </Stack>
                
                <Divider sx={{ mb: 4 }} />

                {/* Content (Viewer) */}
                <Box sx={{ minHeight: '300px', mb: 4 }}>
                    <Viewer initialValue={post.content || ''} />
                </Box>

                {/* Files */}
                {post.fileDTOs && post.fileDTOs.length > 0 && (
                    <Box sx={{ mt: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                        <Typography variant="h6" gutterBottom>첨부 파일</Typography>
                        {post.fileDTOs.map((file, idx) => (
                            <Box key={idx} mb={2}>
                                {file.type === 'IMAGE' ? (
                                    <img 
                                        src={`${BACKEND_API_BASE_URL}/display?fileName=${file.imageURL}`} 
                                        alt={file.fileName} 
                                        style={{ maxWidth: '100%', borderRadius: '8px' }} 
                                    />
                                ) : (
                                    <video 
                                        src={`${BACKEND_API_BASE_URL}/display?fileName=${file.imageURL}`} 
                                        controls 
                                        style={{ maxWidth: '100%' }} 
                                    />
                                )}
                            </Box>
                        ))}
                    </Box>
                )}

                {/* Like Button */}
                <Box display="flex" justifyContent="center" mt={6} mb={4}>
                    <Button
                        variant={post.isLiked ? "contained" : "outlined"}
                        color="error"
                        size="large"
                        startIcon={post.isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                        onClick={handleLike}
                        sx={{ borderRadius: 10, px: 4, py: 1 }}
                    >
                        좋아요 {post.likeCount}
                    </Button>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* Footer Actions */}
                <Stack direction="row" justifyContent="space-between">
                    <Button 
                        variant="outlined" 
                        startIcon={<ListIcon />} 
                        onClick={() => navigate('/freeboard')}
                    >
                        목록
                    </Button>
                    <Button 
                        variant="contained" 
                        color="error" 
                        startIcon={<DeleteIcon />} 
                        onClick={handleDelete}
                    >
                        삭제
                    </Button>
                </Stack>
            </Paper>
        </Container>
    );
};

export default FreeBoardRead;
