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
    Avatar,
    Dialog,
    DialogContent,
    IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ListIcon from '@mui/icons-material/List';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import YouTubeIcon from '@mui/icons-material/YouTube';

// Toast UI Viewer
import { Viewer } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const FreeBoardRead = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [openPreview, setOpenPreview] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);

    const handlePreview = (file) => {
        setPreviewFile(file);
        setOpenPreview(true);
    };

    const handleClosePreview = () => {
        setOpenPreview(false);
        setPreviewFile(null);
    };

    const getEmbedUrl = (url) => {
        if (!url) return '';
        let videoId = '';
        if (url.includes('v=')) {
            videoId = url.split('v=')[1];
            const ampersandPosition = videoId.indexOf('&');
            if(ampersandPosition !== -1) {
                videoId = videoId.substring(0, ampersandPosition);
            }
        } else if (url.includes('youtu.be/')) {
           videoId = url.split('youtu.be/')[1];
        }
        return `https://www.youtube.com/embed/${videoId}`;
    };

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

    const handleDislike = async () => {
        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}/dislike`, { method: 'POST' });
            if(res.ok) {
                const result = await res.json();
                setPost(prev => ({
                    ...prev, 
                    isDisliked: result.isDisliked,
                    dislikeCount: result.isDisliked ? prev.dislikeCount + 1 : prev.dislikeCount - 1
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
                    <Viewer 
                        initialValue={post.content ? post.content.replace(/!\[youtube_video\]\(https:\/\/img\.youtube\.com\/vi\/([a-zA-Z0-9_-]+)\/0\.jpg\)/g, (match, videoId) => {
                            return `<div style="display: flex; justify-content: center; margin: 20px 0;"><iframe src="https://www.youtube.com/embed/${videoId}" width="640" height="360" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
                        }) : ''}
                        customHTMLSanitizer={html => {
                            return html; // Allow iframe
                        }}
                    />
                </Box>


                {/* Attached Files List */}
                {post.fileDTOs && post.fileDTOs.filter(f => f.type !== 'YOUTUBE').length > 0 && (
                    <Box sx={{ mt: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                        <Typography variant="h6" gutterBottom fontWeight="bold">첨부 파일</Typography>
                        <Stack spacing={1}>
                            {post.fileDTOs.filter(f => f.type !== 'YOUTUBE').map((file, idx) => {
                                const fileUrl = `${BACKEND_API_BASE_URL}/display?fileName=${file.imageURL}`;
                                const downloadUrl = `${BACKEND_API_BASE_URL}/download?fileName=${file.imageURL}`;
                                return (
                                    <Stack 
                                        key={idx} 
                                        direction="row" 
                                        alignItems="center" 
                                        justifyContent="space-between"
                                        sx={{ 
                                            p: 1.5, 
                                            bgcolor: '#fff', 
                                            borderRadius: 1, 
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            transition: 'transform 0.2s',
                                            '&:hover': { transform: 'translateY(-2px)' }
                                        }}
                                    >
                                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ overflow: 'hidden' }}>
                                            <Avatar sx={{ width: 32, height: 32, bgcolor: '#e3f2fd', color: '#1976d2' }}>
                                                <ListIcon fontSize="small" />
                                            </Avatar>
                                            <Typography variant="body2" noWrap sx={{ maxWidth: '300px' }}>{file.fileName}</Typography>
                                        </Stack>
                                        
                                        <Stack direction="row" spacing={1}>
                                            {(file.type === 'IMAGE' || file.type === 'VIDEO') && (
                                                <IconButton 
                                                    size="small" 
                                                    onClick={() => handlePreview(file)}
                                                    title="미리보기"
                                                    sx={{ bgcolor: '#f5f5f5' }}
                                                >
                                                    <SearchIcon color="primary" />
                                                </IconButton>
                                            )}
                                            <Button 
                                                variant="outlined" 
                                                size="small" 
                                                href={downloadUrl}
                                                // download attribute is optional when server sets Content-Disposition
                                                sx={{ minWidth: '80px' }}
                                            >
                                                다운로드
                                            </Button>
                                        </Stack>
                                    </Stack>
                                );
                            })}
                        </Stack>
                    </Box>
                )}

                {/* Preview Dialog */}
                <Dialog 
                    open={openPreview} 
                    onClose={handleClosePreview}
                    maxWidth="lg"
                    PaperProps={{
                        sx: { 
                            bgcolor: 'transparent', 
                            boxShadow: 'none',
                            maxHeight: '90vh',
                            overflow: 'visible'
                        }
                    }}
                >
                    <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <IconButton 
                            onClick={handleClosePreview}
                            sx={{ 
                                position: 'absolute', 
                                top: -40, 
                                right: 0, 
                                color: 'white', 
                                bgcolor: 'rgba(0,0,0,0.5)', 
                                '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } 
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                        {previewFile && previewFile.type === 'IMAGE' && (
                            <img 
                                src={`${BACKEND_API_BASE_URL}/display?fileName=${previewFile.imageURL}`} 
                                alt="Preview" 
                                style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }} 
                            />
                        )}
                        {previewFile && previewFile.type === 'VIDEO' && (
                            <video 
                                src={`${BACKEND_API_BASE_URL}/display?fileName=${previewFile.imageURL}`} 
                                controls 
                                autoPlay
                                style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }} 
                            />
                        )}
                    </Box>
                </Dialog>

                {/* Like & Dislike Buttons */}
                <Box display="flex" justifyContent="center" gap={2} mt={6} mb={4}>
                    <Button
                        variant={post.isLiked ? "contained" : "outlined"}
                        color="primary"
                        size="large"
                        startIcon={post.isLiked ? <ThumbUpIcon /> : <ThumbUpOffAltIcon />}
                        onClick={handleLike}
                        sx={{ borderRadius: 10, px: 4, py: 1 }}
                    >
                        좋아요 {post.likeCount}
                    </Button>
                    
                    <Button
                        variant={post.isDisliked ? "contained" : "outlined"}
                        color="error"
                        size="large"
                        startIcon={post.isDisliked ? <ThumbDownIcon /> : <ThumbDownOffAltIcon />}
                        onClick={handleDislike}
                        sx={{ borderRadius: 10, px: 4, py: 1 }}
                    >
                        싫어요 {post.dislikeCount || 0}
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
