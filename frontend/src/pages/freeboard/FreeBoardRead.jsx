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
    IconButton,
    TextField
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
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
    
    // 댓글 관련 상태
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [replyMode, setReplyMode] = useState({ active: false, parentId: null, parentNickname: '' });
    const [editMode, setEditMode] = useState({ active: false, commentId: null, text: '' });

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
                    const data = await res.json();
                    console.log('📖 게시글 데이터:', data);
                    console.log('📝 Content:', data.content);
                    console.log('📎 파일 목록:', data.fileDTOs);
                    setPost(data);
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

    // 댓글 조회
    const fetchComments = async () => {
        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}/comments`, { method: 'GET' });
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (e) {
            console.error('댓글 조회 오류:', e);
        }
    };

    // 댓글 작성
    const handleCommentSubmit = async () => {
        if (!commentText.trim()) {
            alert('댓글 내용을 입력하세요.');
            return;
        }

        try {
            const payload = {
                comment: commentText,
                parentId: replyMode.active ? replyMode.parentId : null
            };

            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setCommentText('');
                setReplyMode({ active: false, parentId: null, parentNickname: '' });
                fetchComments();
            }
        } catch (e) {
            console.error('댓글 작성 오류:', e);
            alert('댓글 작성에 실패했습니다.');
        }
    };

    // 댓글 수정
    const handleCommentEdit = async (commentId) => {
        if (!editMode.text.trim()) {
            alert('댓글 내용을 입력하세요.');
            return;
        }

        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}/comments/${commentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: editMode.text })
            });

            if (res.ok) {
                setEditMode({ active: false, commentId: null, text: '' });
                fetchComments();
            }
        } catch (e) {
            console.error('댓글 수정 오류:', e);
            alert('댓글 수정에 실패했습니다.');
        }
    };

    // 댓글 삭제
    const handleCommentDelete = async (commentId) => {
        if (!confirm('댓글을 삭제하시겠습니까?')) return;

        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}/comments/${commentId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                fetchComments();
            }
        } catch (e) {
            console.error('댓글 삭제 오류:', e);
            alert('댓글 삭제에 실패했습니다.');
        }
    };

    // 게시글과 댓글 동시 조회
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}`, { method: 'GET' });
                if (res.ok) {
                    const data = await res.json();
                    console.log('📖 게시글 데이터:', data);
                    console.log('📝 Content:', data.content);
                    console.log('📎 파일 목록:', data.fileDTOs);
                    setPost(data);
                    fetchComments(); // 댓글도 함께 조회
                } else {
                    alert("Could not load post");
                    navigate('/freeboard');
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchData();
    }, [id, navigate]);

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
                        initialValue={post.content ? post.content
                            // YouTube 비디오 처리 (개별 div로 완전히 감싸기)
                            .replace(/!\[youtube_video\]\(https:\/\/img\.youtube\.com\/vi\/([a-zA-Z0-9_-]+)\/0\.jpg\)/g, (match, videoId) => {
                                return `\n\n<div style="display: flex; justify-content: center; margin: 20px 0;"><iframe src="https://www.youtube.com/embed/${videoId}" width="640" height="360" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>\n\n`;
                            })
                            // 일반 이미지를 HTML img 태그로 변환 (개별 div로 감싸기)
                            .replace(/!\[(.*?)\]\((http:\/\/localhost:8080\/display\?fileName=.*?)\)/g, (match, alt, url) => {
                                return `\n\n<div style="text-align: center; margin: 20px 0;"><img src="${url}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" /></div>\n\n`;
                            })
                            : ''}
                        linkAttributes={{
                            target: '_blank',
                            rel: 'noopener noreferrer'
                        }}
                        customHTMLRenderer={{
                            htmlBlock: {
                                iframe(node) {
                                    return [
                                        { type: 'openTag', tagName: 'iframe', outerNewLine: true, attributes: node.attrs },
                                        { type: 'html', content: node.childrenHTML },
                                        { type: 'closeTag', tagName: 'iframe', outerNewLine: true }
                                    ];
                                },
                                div(node) {
                                    return [
                                        { type: 'openTag', tagName: 'div', outerNewLine: true, attributes: node.attrs },
                                        { type: 'html', content: node.childrenHTML },
                                        { type: 'closeTag', tagName: 'div', outerNewLine: true }
                                    ];
                                },
                                img(node) {
                                    return [
                                        { type: 'openTag', tagName: 'img', outerNewLine: true, attributes: node.attrs, selfClose: true }
                                    ];
                                }
                            }
                        }}
                        customHTMLSanitizer={(html) => {
                            // iframe, div, img 모두 허용
                            return html;
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

                {/* 댓글 섹션 */}
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                        댓글 {comments.length}개
                    </Typography>

                    {/* 댓글 작성 */}
                    <Paper elevation={1} sx={{ p: 2, mb: 3, bgcolor: '#f9f9f9' }}>
                        {replyMode.active && (
                            <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" color="primary">
                                    @{replyMode.parentNickname}님에게 답글 작성 중...
                                </Typography>
                                <Button 
                                    size="small" 
                                    onClick={() => {
                                        setReplyMode({ active: false, parentId: null, parentNickname: '' });
                                        setCommentText('');
                                    }}
                                >
                                    취소
                                </Button>
                            </Box>
                        )}
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            placeholder={replyMode.active ? "답글을 입력하세요..." : "댓글을 입력하세요..."}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            variant="outlined"
                            sx={{ mb: 1, bgcolor: 'white' }}
                        />
                        <Stack direction="row" justifyContent="flex-end">
                            <Button 
                                variant="contained" 
                                onClick={handleCommentSubmit}
                                disabled={!commentText.trim()}
                            >
                                {replyMode.active ? '답글 작성' : '댓글 작성'}
                            </Button>
                        </Stack>
                    </Paper>

                    {/* 댓글 목록 */}
                    <Stack spacing={2}>
                        {comments.map((comment) => (
                            <Box key={comment.id}>
                                {/* 댓글 */}
                                <Paper elevation={1} sx={{ p: 2 }}>
                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                                            {comment.writerNickname?.charAt(0) || 'U'}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {comment.writerNickname}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(comment.regDate).toLocaleString('ko-KR')}
                                                </Typography>
                                                {comment.modDate !== comment.regDate && (
                                                    <Chip label="수정됨" size="small" variant="outlined" />
                                                )}
                                            </Stack>

                                            {/* 수정 모드 */}
                                            {editMode.active && editMode.commentId === comment.id ? (
                                                <>
                                                    <TextField
                                                        fullWidth
                                                        multiline
                                                        rows={2}
                                                        value={editMode.text}
                                                        onChange={(e) => setEditMode({ ...editMode, text: e.target.value })}
                                                        sx={{ mb: 1 }}
                                                    />
                                                    <Stack direction="row" spacing={1}>
                                                        <Button 
                                                            size="small" 
                                                            variant="contained"
                                                            onClick={() => handleCommentEdit(comment.id)}
                                                        >
                                                            저장
                                                        </Button>
                                                        <Button 
                                                            size="small"
                                                            onClick={() => setEditMode({ active: false, commentId: null, text: '' })}
                                                        >
                                                            취소
                                                        </Button>
                                                    </Stack>
                                                </>
                                            ) : (
                                                <>
                                                    <Typography variant="body1" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                                                        {comment.isDeleted ? '삭제된 댓글입니다.' : comment.comment}
                                                    </Typography>
                                                    {!comment.isDeleted && (
                                                        <Stack direction="row" spacing={1}>
                                                            <Button 
                                                                size="small"
                                                                onClick={() => setReplyMode({ 
                                                                    active: true, 
                                                                    parentId: comment.id, 
                                                                    parentNickname: comment.writerNickname 
                                                                })}
                                                            >
                                                                답글
                                                            </Button>
                                                            {comment.canEdit && (
                                                                <Button 
                                                                    size="small"
                                                                    onClick={() => setEditMode({ 
                                                                        active: true, 
                                                                        commentId: comment.id, 
                                                                        text: comment.comment 
                                                                    })}
                                                                >
                                                                    수정
                                                                </Button>
                                                            )}
                                                            {comment.canDelete && (
                                                                <Button 
                                                                    size="small" 
                                                                    color="error"
                                                                    onClick={() => handleCommentDelete(comment.id)}
                                                                >
                                                                    삭제
                                                                </Button>
                                                            )}
                                                        </Stack>
                                                    )}
                                                </>
                                            )}
                                        </Box>
                                    </Stack>
                                </Paper>

                                {/* 대댓글 */}
                                {comment.children && comment.children.length > 0 && (
                                    <Box sx={{ ml: 6, mt: 1 }}>
                                        <Stack spacing={1}>
                                            {comment.children.map((reply) => (
                                                <Paper key={reply.id} elevation={1} sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                                        <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
                                                            {reply.writerNickname?.charAt(0) || 'U'}
                                                        </Avatar>
                                                        <Box sx={{ flex: 1 }}>
                                                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                                                <Typography variant="subtitle2" fontWeight="bold">
                                                                    {reply.writerNickname}
                                                                </Typography>
                                                                <Typography variant="caption" color="text.secondary">
                                                                    {new Date(reply.regDate).toLocaleString('ko-KR')}
                                                                </Typography>
                                                                {reply.modDate !== reply.regDate && (
                                                                    <Chip label="수정됨" size="small" variant="outlined" />
                                                                )}
                                                            </Stack>

                                                            {/* 대댓글 수정 모드 */}
                                                            {editMode.active && editMode.commentId === reply.id ? (
                                                                <>
                                                                    <TextField
                                                                        fullWidth
                                                                        multiline
                                                                        rows={2}
                                                                        value={editMode.text}
                                                                        onChange={(e) => setEditMode({ ...editMode, text: e.target.value })}
                                                                        sx={{ mb: 1 }}
                                                                    />
                                                                    <Stack direction="row" spacing={1}>
                                                                        <Button 
                                                                            size="small" 
                                                                            variant="contained"
                                                                            onClick={() => handleCommentEdit(reply.id)}
                                                                        >
                                                                            저장
                                                                        </Button>
                                                                        <Button 
                                                                            size="small"
                                                                            onClick={() => setEditMode({ active: false, commentId: null, text: '' })}
                                                                        >
                                                                            취소
                                                                        </Button>
                                                                    </Stack>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                                                                        {reply.isDeleted ? '삭제된 댓글입니다.' : reply.comment}
                                                                    </Typography>
                                                                    {!reply.isDeleted && (
                                                                        <Stack direction="row" spacing={1}>
                                                                            {reply.canEdit && (
                                                                                <Button 
                                                                                    size="small"
                                                                                    onClick={() => setEditMode({ 
                                                                                        active: true, 
                                                                                        commentId: reply.id, 
                                                                                        text: reply.comment 
                                                                                    })}
                                                                                >
                                                                                    수정
                                                                                </Button>
                                                                            )}
                                                                            {reply.canDelete && (
                                                                                <Button 
                                                                                    size="small" 
                                                                                    color="error"
                                                                                    onClick={() => handleCommentDelete(reply.id)}
                                                                                >
                                                                                    삭제
                                                                                </Button>
                                                                            )}
                                                                        </Stack>
                                                                    )}
                                                                </>
                                                            )}
                                                        </Box>
                                                    </Stack>
                                                </Paper>
                                            ))}
                                        </Stack>
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Stack>
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
                    {(post.canEdit || post.canDelete) && (
                        <Stack direction="row" spacing={1}>
                            {post.canEdit && (
                                <Button 
                                    variant="contained" 
                                    color="primary" 
                                    startIcon={<EditIcon />} 
                                    onClick={() => navigate(`/freeboard/edit/${id}`)}
                                >
                                    수정
                                </Button>
                            )}
                            {post.canDelete && (
                                <Button 
                                    variant="contained" 
                                    color="error" 
                                    startIcon={<DeleteIcon />} 
                                    onClick={handleDelete}
                                >
                                    삭제
                                </Button>
                            )}
                        </Stack>
                    )}
                </Stack>
            </Paper>
        </Container>
    );
};

export default FreeBoardRead;
