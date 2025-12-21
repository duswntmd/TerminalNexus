import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Container, 
    Typography, 
    Box, 
    Paper, 
    Button, 
    Divider, 
    Stack,
    Avatar,
    TextField,
    CircularProgress,
    Alert,
    Dialog,
    DialogContent,
    IconButton
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';

import { Viewer } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';

import { usePost } from './hooks/usePost';
import { useComments } from './hooks/useComments';
import CommentItem from './components/CommentItem';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

function FreeBoardRead() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // Preview State
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');

    // Custom Hooks
    const {
        post,
        loading,
        fetchPost,
        handleDelete,
        handleLike,
        handleDislike
    } = usePost(id);

    const {
        comments,
        commentText,
        setCommentText,
        editMode,
        setEditMode,
        replyMode,
        setReplyMode,
        fetchComments,
        handleCommentSubmit,
        handleCommentEdit,
        handleCommentDelete
    } = useComments(id);

    // 초기 데이터 로드
    useEffect(() => {
        fetchPost();
        fetchComments();
    }, [fetchPost, fetchComments]);

    // 게시글 삭제 처리
    const onDelete = async () => {
        const success = await handleDelete();
        if (success) {
            navigate('/freeboard');
        }
    };

    if (loading) {
        return (
            <Container sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
                <CircularProgress />
            </Container>
        );
    }

    if (!post) {
        return (
            <Container sx={{ mt: 5 }}>
                <Alert severity="error">게시글을 찾을 수 없습니다.</Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                {/* 제목 */}
                <Typography variant="h4" gutterBottom fontWeight="bold">
                    {post.title}
                </Typography>

                {/* 작성자 정보 */}
                <Stack 
                    direction="row" 
                    spacing={2} 
                    sx={{ mb: 3 }}
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
                        <Typography variant="body2">
                            {new Date(
                                post.modDate !== post.regDate ? post.modDate : post.regDate
                            ).toLocaleString()}
                        </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <VisibilityIcon fontSize="small" />
                        <Typography variant="body2">{post.viewCount}</Typography>
                    </Stack>
                </Stack>
                
                <Divider sx={{ mb: 4 }} />

                {/* 본문 (Toast UI Viewer) */}
                <Box sx={{ minHeight: '300px', mb: 4 }}>
                    <Viewer 
                        initialValue={post.content ? post.content
                            .replace(/!\[youtube_video\]\(https:\/\/img\.youtube\.com\/vi\/([a-zA-Z0-9_-]+)\/0\.jpg\)/g, (match, videoId) => {
                                return `\n\n<div style="display: flex; justify-content: center; margin: 20px 0;"><iframe src="https://www.youtube.com/embed/${videoId}" width="640" height="360" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>\n\n`;
                            })
                            .replace(/!\[(.*?)\]\((http:\/\/localhost:8080\/display\?fileName=.*?)\)/g, (match, alt, url) => {
                                return `\n\n<div style="text-align: center; margin: 20px 0;"><img src="${url}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" /></div>\n\n`;
                            })
                            // @video 위젯을 HTML video 태그로 변환
                            .replace(/\$\$widget\d+\s+@video\[(.*?)\]\$\$/g, (match, url) => {
                                return `\n\n<div style="display: flex; justify-content: center; margin: 20px 0;"><video controls style="max-width: 100%; border-radius: 8px;"><source src="${url}" type="video/mp4" /></video></div>\n\n`;
                            })
                            : ''}
                        customHTMLSanitizer={(html) => html}
                    />
                </Box>

                {/* 첨부파일 목록 */}
                {post.fileDTOs && post.fileDTOs.length > 0 && (
                    <Box sx={{ mb: 4, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                        <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                            첨부파일
                        </Typography>
                        <Stack spacing={1}>
                            {post.fileDTOs.map((file, index) => {
                                const isImage = file.type === 'IMAGE' || (file.fileName && file.fileName.match(/\.(jpg|jpeg|png|gif|bmp)$/i));
                                const imageUrl = `${BACKEND_API_BASE_URL}/display?fileName=${encodeURIComponent(file.folderPath + "/" + file.uuid + "_" + file.fileName)}`;
                                
                                return (
                                    <Stack key={index} direction="row" alignItems="center" spacing={1} sx={{ p: 1, borderBottom: '1px solid #eee' }}>
                                        <Typography variant="body2">📎</Typography>
                                        
                                        <Typography 
                                            variant="body2" 
                                            fontWeight="bold"
                                            component="a"
                                            href={`${BACKEND_API_BASE_URL}/download?fileName=${encodeURIComponent(file.folderPath + "/" + file.uuid + "_" + file.fileName)}`} 
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{ 
                                                color: 'text.primary',
                                                textDecoration: 'none',
                                                '&:hover': { textDecoration: 'underline', color: 'primary.main' },
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {file.fileName}
                                        </Typography>

                                        {/* 이미지인 경우 미리보기 버튼 표시 */}
                                        {isImage && (
                                            <IconButton 
                                                size="small" 
                                                onClick={() => {
                                                    setPreviewUrl(imageUrl);
                                                    setPreviewOpen(true);
                                                }}
                                                title="미리보기"
                                            >
                                                <ZoomInIcon fontSize="small" />
                                            </IconButton>
                                        )}
                                    </Stack>
                                );
                            })}
                        </Stack>
                    </Box>
                )}

                {/* 이미지 미리보기 모달 */}
                <Dialog 
                    open={previewOpen} 
                    onClose={() => setPreviewOpen(false)}
                    maxWidth="lg"
                    fullWidth
                    PaperProps={{
                        style: {
                            backgroundColor: 'transparent',
                            boxShadow: 'none',
                            maxHeight: '90vh'
                        },
                    }}
                >
                    <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                         <IconButton 
                            onClick={() => setPreviewOpen(false)}
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
                        <img 
                            src={previewUrl} 
                            alt="Preview" 
                            style={{ 
                                maxWidth: '100%', 
                                maxHeight: '85vh', 
                                objectFit: 'contain',
                                borderRadius: '8px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                            }} 
                        />
                    </Box>
                </Dialog>

                {/* 좋아요/싫어요 */}
                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 4 }}>
                    <Button
                        variant={post.isLiked ? "contained" : "outlined"}
                        startIcon={<ThumbUpIcon />}
                        onClick={handleLike}
                    >
                        좋아요 {post.likeCount}
                    </Button>
                    <Button
                        variant={post.isDisliked ? "contained" : "outlined"}
                        color="error"
                        startIcon={<ThumbDownIcon />}
                        onClick={handleDislike}
                    >
                        싫어요 {post.dislikeCount}
                    </Button>
                </Stack>

                <Divider sx={{ mb: 4 }} />

                {/* 버튼 */}
                <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button variant="outlined" onClick={() => navigate('/freeboard')}>
                        목록
                    </Button>
                    {post.canEdit && (
                        <Button variant="contained" onClick={() => navigate(`/freeboard/edit/${id}`)}>
                            수정
                        </Button>
                    )}
                    {post.canDelete && (
                        <Button variant="contained" color="error" onClick={onDelete}>
                            삭제
                        </Button>
                    )}
                </Stack>
            </Paper>

            {/* 댓글 섹션 */}
<Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom>
                    댓글 {comments.length}개
                </Typography>

                {/* 댓글 작성 폼 */}
                <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                    {replyMode.active && (
                        <Alert severity="info" sx={{ mb: 2 }} onClose={() => setReplyMode({ active: false, parentId: null })}>
                            {replyMode.parentNickname}님에게 답글 작성 중
                        </Alert>
                    )}
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="댓글을 입력하세요..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        {replyMode.active && (
                            <Button onClick={() => setReplyMode({ active: false, parentId: null })}>
                                취소
                            </Button>
                        )}
                        <Button variant="contained" onClick={handleCommentSubmit}>
                            {replyMode.active ? '답글 작성' : '댓글 작성'}
                        </Button>
                    </Stack>
                </Paper>

                {/* 댓글 목록 */}
                <Stack spacing={2}>
                    {comments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            depth={0}
                            editMode={editMode}
                            setEditMode={setEditMode}
                            replyMode={replyMode}
                            setReplyMode={setReplyMode}
                            handleCommentEdit={handleCommentEdit}
                            handleCommentDelete={handleCommentDelete}
                        />
                    ))}
                </Stack>
            </Box>
        </Container>
    );
}

export default FreeBoardRead;
