import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Box,
    Button,
    Stack,
    Avatar,
    TextField,
    CircularProgress,
    Chip,
    Dialog,
    IconButton,
    Divider,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { Viewer } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';

import { usePost } from './hooks/usePost';
import { useComments } from './hooks/useComments';
import CommentItem from './components/CommentItem';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

/* ── 다크 인풋 공통 SX ── */
const darkInputSx = {
    '& .MuiOutlinedInput-root': {
        bgcolor: 'rgba(255,255,255,0.04)',
        borderRadius: '10px',
        color: '#f4f4f5',
        '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
        '&.Mui-focused fieldset': { borderColor: '#818cf8' },
    },
    '& .MuiInputBase-input::placeholder': { color: '#52525b', opacity: 1 },
};

function FreeBoardRead() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewUrl, setPreviewUrl] = useState('');

    const {
        post, loading, fetchPost,
        handleDelete, handleLike, handleDislike
    } = usePost(id);

    const {
        comments, commentText, setCommentText,
        editMode, setEditMode, replyMode, setReplyMode,
        fetchComments, handleCommentSubmit,
        handleCommentEdit, handleCommentDelete
    } = useComments(id);

    useEffect(() => {
        fetchPost();
        fetchComments();
    }, [fetchPost, fetchComments]);

    const onDelete = async () => {
        const success = await handleDelete();
        if (success) navigate('/freeboard');
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#000' }}>
                <CircularProgress sx={{ color: '#818cf8' }} />
            </Box>
        );
    }

    if (!post) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ p: 3, borderRadius: '14px', bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                    게시글을 찾을 수 없습니다.
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff', pt: { xs: 10, md: 12 }, pb: 10 }}>
            {/* 배경 글로우 */}
            <Box sx={{
                position: 'fixed', top: '10%', right: '5%',
                width: '35vw', height: '35vw', maxWidth: 500, maxHeight: 500,
                background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 65%)',
                pointerEvents: 'none', zIndex: 0,
            }} />

            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                {/* 본문 카드 */}
                <Box
                    sx={{
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.07)',
                        bgcolor: 'rgba(255,255,255,0.02)',
                        p: { xs: 3, md: 5 },
                        mb: 4,
                    }}
                >
                    {/* 제목 */}
                    <Typography
                        variant="h3" fontWeight={800}
                        sx={{ mb: 3, color: '#f4f4f5', letterSpacing: '-1px', lineHeight: 1.3, fontSize: { xs: '1.6rem', md: '2.2rem' } }}
                    >
                        {post.title}
                    </Typography>

                    {/* 메타 정보 */}
                    <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} sx={{ mb: 4 }}>
                        <Chip
                            icon={<PersonIcon sx={{ fontSize: '0.9rem !important', color: '#71717a !important' }} />}
                            label={post.writerNickname}
                            size="small"
                            sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.07)' }}
                        />
                        <Chip
                            icon={<AccessTimeIcon sx={{ fontSize: '0.9rem !important', color: '#71717a !important' }} />}
                            label={new Date(post.modDate !== post.regDate ? post.modDate : post.regDate).toLocaleString('ko-KR')}
                            size="small"
                            sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: '#71717a', border: '1px solid rgba(255,255,255,0.07)' }}
                        />
                        <Chip
                            icon={<VisibilityIcon sx={{ fontSize: '0.9rem !important', color: '#71717a !important' }} />}
                            label={`조회 ${post.viewCount}`}
                            size="small"
                            sx={{ bgcolor: 'rgba(255,255,255,0.04)', color: '#71717a', border: '1px solid rgba(255,255,255,0.07)' }}
                        />
                    </Stack>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 4 }} />

                    {/* 본문 - Toast UI Viewer (다크 오버라이드) */}
                    <Box sx={{
                        minHeight: 300, mb: 4,
                        '& .toastui-editor-contents': {
                            color: '#d4d4d8 !important',
                            fontFamily: 'inherit !important',
                            fontSize: '0.95rem !important',
                            lineHeight: '1.8 !important',
                        },
                        '& .toastui-editor-contents p': { color: '#d4d4d8 !important' },
                        '& .toastui-editor-contents h1, & .toastui-editor-contents h2, & .toastui-editor-contents h3': { color: '#f4f4f5 !important' },
                        '& .toastui-editor-contents code': {
                            bgcolor: 'rgba(255,255,255,0.08) !important',
                            color: '#a5b4fc !important',
                            borderRadius: '4px',
                            padding: '0.1em 0.4em',
                        },
                        '& .toastui-editor-contents blockquote': {
                            borderLeft: '3px solid rgba(129,140,248,0.4)',
                            color: '#71717a !important',
                        },
                    }}>
                        <Viewer
                            initialValue={post.content ? post.content
                                .replace(/!\[youtube_video\]\(https:\/\/img\.youtube\.com\/vi\/([a-zA-Z0-9_-]+)\/0\.jpg\)/g, (_, videoId) => {
                                    return `\n\n<div style="display:flex;justify-content:center;margin:20px 0"><iframe src="https://www.youtube.com/embed/${videoId}" width="640" height="360" frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div>\n\n`;
                                })
                                .replace(/!\[(.*?)\]\((http:\/\/localhost:8080\/display\?fileName=.*?)\)/g, (_, alt, url) => {
                                    return `\n\n<div style="text-align:center;margin:20px 0"><img src="${url}" alt="${alt}" style="max-width:100%;height:auto;border-radius:8px;" /></div>\n\n`;
                                })
                                .replace(/\$\$widget\d+\s+@video\[(.*?)\]\$\$/g, (_, url) => {
                                    return `\n\n<div style="display:flex;justify-content:center;margin:20px 0"><video controls style="max-width:100%;border-radius:8px"><source src="${url}" type="video/mp4" /></video></div>\n\n`;
                                })
                                : ''}
                            customHTMLSanitizer={(html) => html}
                        />
                    </Box>

                    {/* 첨부파일 */}
                    {post.fileDTOs && post.fileDTOs.length > 0 && (
                        <Box sx={{ mb: 4, p: 2.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <Typography sx={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', mb: 1.5 }}>
                                첨부파일
                            </Typography>
                            <Stack spacing={1}>
                                {post.fileDTOs.map((file, index) => {
                                    const isImage = file.type === 'IMAGE' || (file.fileName && file.fileName.match(/\.(jpg|jpeg|png|gif|bmp)$/i));
                                    const imageUrl = `${BACKEND_API_BASE_URL}/display?fileName=${encodeURIComponent(file.folderPath + "/" + file.uuid + "_" + file.fileName)}`;
                                    return (
                                        <Stack key={index} direction="row" alignItems="center" spacing={1.5}
                                            sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                                        >
                                            <Typography sx={{ fontSize: '0.85rem' }}>📎</Typography>
                                            <Typography
                                                component="a"
                                                href={`${BACKEND_API_BASE_URL}/download?fileName=${encodeURIComponent(file.folderPath + "/" + file.uuid + "_" + file.fileName)}`}
                                                target="_blank" rel="noopener noreferrer"
                                                sx={{ color: '#818cf8', fontSize: '0.85rem', textDecoration: 'none', flex: 1, '&:hover': { textDecoration: 'underline' } }}
                                            >
                                                {file.fileName}
                                            </Typography>
                                            {isImage && (
                                                <IconButton size="small" onClick={() => { setPreviewUrl(imageUrl); setPreviewOpen(true); }}
                                                    sx={{ color: '#52525b', '&:hover': { color: '#818cf8' } }}>
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
                    <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth
                        PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none', maxHeight: '90vh' } }}
                    >
                        <Box sx={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <IconButton onClick={() => setPreviewOpen(false)}
                                sx={{ position: 'absolute', top: -40, right: 0, color: 'white', bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}>
                                <CloseIcon />
                            </IconButton>
                            <img src={previewUrl} alt="Preview"
                                style={{ maxWidth: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }} />
                        </Box>
                    </Dialog>

                    {/* 좋아요 / 싫어요 */}
                    <Stack direction="row" spacing={2} justifyContent="center" sx={{ my: 4 }}>
                        <Button
                            variant={post.isLiked ? "contained" : "outlined"}
                            startIcon={<ThumbUpIcon />}
                            onClick={handleLike}
                            sx={post.isLiked
                                ? { bgcolor: '#818cf8', color: '#fff', borderRadius: '10px', textTransform: 'none', '&:hover': { bgcolor: '#6366f1' } }
                                : { borderColor: 'rgba(255,255,255,0.12)', color: '#a1a1aa', borderRadius: '10px', textTransform: 'none', '&:hover': { borderColor: '#818cf8', color: '#818cf8', bgcolor: 'rgba(129,140,248,0.06)' } }
                            }
                        >
                            좋아요 {post.likeCount}
                        </Button>
                        <Button
                            variant={post.isDisliked ? "contained" : "outlined"}
                            startIcon={<ThumbDownIcon />}
                            onClick={handleDislike}
                            sx={post.isDisliked
                                ? { bgcolor: '#ef4444', color: '#fff', borderRadius: '10px', textTransform: 'none', '&:hover': { bgcolor: '#dc2626' } }
                                : { borderColor: 'rgba(255,255,255,0.12)', color: '#a1a1aa', borderRadius: '10px', textTransform: 'none', '&:hover': { borderColor: '#ef4444', color: '#ef4444', bgcolor: 'rgba(239,68,68,0.06)' } }
                            }
                        >
                            싫어요 {post.dislikeCount}
                        </Button>
                    </Stack>

                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mb: 3 }} />

                    {/* 하단 버튼 */}
                    <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                        <Button
                            variant="outlined" startIcon={<ArrowBackIcon />}
                            onClick={() => navigate('/freeboard')}
                            sx={{ borderRadius: '10px', borderColor: 'rgba(255,255,255,0.1)', color: '#a1a1aa', textTransform: 'none', '&:hover': { borderColor: 'rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.03)' } }}
                        >
                            목록
                        </Button>
                        {post.canEdit && (
                            <Button variant="outlined" startIcon={<EditIcon />}
                                onClick={() => navigate(`/freeboard/edit/${id}`)}
                                sx={{ borderRadius: '10px', borderColor: 'rgba(129,140,248,0.3)', color: '#818cf8', textTransform: 'none', '&:hover': { bgcolor: 'rgba(129,140,248,0.06)', borderColor: '#818cf8' } }}
                            >
                                수정
                            </Button>
                        )}
                        {post.canDelete && (
                            <Button variant="outlined" startIcon={<DeleteIcon />} onClick={onDelete}
                                sx={{ borderRadius: '10px', borderColor: 'rgba(239,68,68,0.25)', color: '#f87171', textTransform: 'none', '&:hover': { bgcolor: 'rgba(239,68,68,0.06)', borderColor: '#ef4444' } }}
                            >
                                삭제
                            </Button>
                        )}
                    </Stack>
                </Box>

                {/* ── 댓글 섹션 ── */}
                <Box>
                    <Typography sx={{ color: '#f4f4f5', fontWeight: 700, fontSize: '1rem', mb: 3 }}>
                        💬 댓글 <span style={{ color: '#52525b', fontWeight: 400 }}>{comments.length}개</span>
                    </Typography>

                    {/* 댓글 작성 폼 */}
                    <Box sx={{ p: 3, mb: 4, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.07)', bgcolor: 'rgba(255,255,255,0.02)' }}>
                        {replyMode.active && (
                            <Box sx={{ mb: 2 }}>
                                <Chip
                                    label={`↩ ${replyMode.parentNickname}님에게 답글 작성 중`}
                                    onDelete={() => setReplyMode({ active: false, parentId: null })}
                                    size="small"
                                    sx={{ bgcolor: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', '& .MuiChip-deleteIcon': { color: '#818cf8' } }}
                                />
                            </Box>
                        )}
                        <TextField
                            fullWidth multiline rows={3}
                            placeholder="댓글을 입력하세요..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            sx={{ ...darkInputSx, mb: 2 }}
                        />
                        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                            {replyMode.active && (
                                <Button onClick={() => setReplyMode({ active: false, parentId: null })}
                                    sx={{ borderRadius: '10px', color: '#71717a', textTransform: 'none' }}>
                                    취소
                                </Button>
                            )}
                            <Button variant="contained" onClick={handleCommentSubmit}
                                sx={{ borderRadius: '10px', bgcolor: '#818cf8', color: '#fff', fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: '#6366f1' } }}>
                                {replyMode.active ? '답글 작성' : '댓글 작성'}
                            </Button>
                        </Stack>
                    </Box>

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
        </Box>
    );
}

export default FreeBoardRead;
