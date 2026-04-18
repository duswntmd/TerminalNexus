import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchWithAccess } from '../../util/fetchUtil';
import {
    Container,
    Typography,
    TextField,
    Button,
    Box,
    Stack,
    Dialog,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Divider,
    Backdrop,
    CircularProgress,
    Chip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import YouTubeIcon from '@mui/icons-material/YouTube';
import MovieIcon from '@mui/icons-material/Movie';

import { Editor } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor-plugin-color-syntax/dist/toastui-editor-plugin-color-syntax.css';
import colorSyntax from '@toast-ui/editor-plugin-color-syntax';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const FreeBoardRegister = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const [title, setTitle] = useState('');
    const [fileDTOs, setFileDTOs] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [existingFiles, setExistingFiles] = useState([]);
    const [deletedFileIds, setDeletedFileIds] = useState([]);
    const [openYoutubeDialog, setOpenYoutubeDialog] = useState(false);
    const [youtubeLinkInput, setYoutubeLinkInput] = useState('');

    const editorRef = useRef();
    const videoInputRef = useRef();

    useEffect(() => {
        if (isEditMode) {
            const fetchPost = async () => {
                try {
                    const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}`, { method: 'GET' });
                    if (res.ok) {
                        const data = await res.json();
                        setTitle(data.title);
                        if (editorRef.current) {
                            editorRef.current.getInstance().setMarkdown(data.content || '');
                        }
                        if (data.fileDTOs) {
                            setExistingFiles(data.fileDTOs.filter(f => f.type !== 'YOUTUBE'));
                        }
                    } else {
                        alert("게시글을 불러올 수 없습니다.");
                        navigate('/freeboard');
                    }
                } catch (e) {
                    console.error('게시글 로드 오류:', e);
                    alert("오류가 발생했습니다.");
                    navigate('/freeboard');
                }
            };
            fetchPost();
        }
    }, [id, isEditMode, navigate]);

    const handleInsertYoutube = () => {
        if (!youtubeLinkInput.trim()) { setOpenYoutubeDialog(false); return; }
        let videoId = '';
        if (youtubeLinkInput.includes('v=')) {
            videoId = youtubeLinkInput.split('v=')[1];
            const amp = videoId.indexOf('&');
            if (amp !== -1) videoId = videoId.substring(0, amp);
        } else if (youtubeLinkInput.includes('youtu.be/')) {
            videoId = youtubeLinkInput.split('youtu.be/')[1];
        }
        if (!videoId) { alert("올바른 YouTube 주소가 아닙니다."); return; }
        const shortcode = `\n![youtube_video](https://img.youtube.com/vi/${videoId}/0.jpg)\n`;
        const editorInstance = editorRef.current?.getInstance();
        if (editorInstance) editorInstance.setMarkdown(editorInstance.getMarkdown() + shortcode);
        setYoutubeLinkInput('');
        setOpenYoutubeDialog(false);
    };

    const handleVideoChange = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setIsLoading(true);
        const formData = new FormData();
        formData.append("uploadFiles", files[0]);
        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/uploadAjax`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error(`Upload Failed: ${res.status}`);
            const result = await res.json();
            if (result && result.length > 0) {
                const { folderPath, uuid, fileName } = result[0];
                const normalizedPath = folderPath.replace(/\\/g, '/');
                const encodedPath = encodeURIComponent(`${normalizedPath}/${uuid}_${fileName}`);
                const fileUrl = `${BACKEND_API_BASE_URL}/display?fileName=${encodedPath}`;
                const shortcode = `\n@video[${fileUrl}]\n`;
                const editorInstance = editorRef.current?.getInstance();
                if (editorInstance) editorInstance.setMarkdown(editorInstance.getMarkdown() + shortcode);
            } else throw new Error("No response data");
        } catch (err) {
            console.error(err);
            alert("동영상 업로드 실패: " + err.message);
        } finally {
            if (videoInputRef.current) videoInputRef.current.value = '';
            setIsLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setIsLoading(true);
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) formData.append("uploadFiles", files[i]);
        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/uploadAjax`, { method: 'POST', body: formData });
            if (!res.ok) throw new Error("Upload Failed");
            const result = await res.json();
            setFileDTOs(prev => [...prev, ...result]);
        } catch (err) {
            console.error(err);
            alert("파일 업로드 실패");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveFile = (index) => {
        const newFiles = [...fileDTOs];
        newFiles.splice(index, 1);
        setFileDTOs(newFiles);
    };

    const handleSubmit = async () => {
        if (!title.trim()) { alert("제목을 입력해주세요."); return; }
        const content = editorRef.current.getInstance().getMarkdown();
        if (!content.trim()) { alert("내용을 입력해주세요."); return; }

        const validDeletedFileIds = deletedFileIds.filter(id => id && id.trim() !== '');
        const payload = {
            title, content, fileDTOs,
            ...(isEditMode && validDeletedFileIds.length > 0 && { deletedFileIds: validDeletedFileIds })
        };

        try {
            setIsLoading(true);
            const url = isEditMode ? `${BACKEND_API_BASE_URL}/freeboard/${id}` : `${BACKEND_API_BASE_URL}/freeboard`;
            const res = await fetchWithAccess(url, {
                method: isEditMode ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                navigate(isEditMode ? `/freeboard/${id}` : '/freeboard');
            } else {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData.message || errData.error || `${isEditMode ? '수정' : '등록'} 실패 (${res.status})`;
                alert(`오류: ${errMsg}`);
            }
        } catch (e) {
            console.error("Network Error:", e);
            alert("네트워크 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff', pt: { xs: 10, md: 12 }, pb: 10 }}>
            <Backdrop sx={{ color: '#818cf8', zIndex: (theme) => theme.zIndex.drawer + 999 }} open={isLoading}>
                <CircularProgress color="inherit" />
            </Backdrop>

            <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
                {/* 헤더 */}
                <Box mb={5}>
                    <Chip
                        label={isEditMode ? '✏️ 게시글 수정' : '📝 새 글 작성'}
                        sx={{ mb: 2, bgcolor: 'rgba(99,102,241,0.08)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)', fontWeight: 700, fontSize: '0.76rem' }}
                    />
                    <Typography variant="h3" fontWeight={800}
                        sx={{ color: '#f4f4f5', letterSpacing: '-1.5px', fontSize: { xs: '1.8rem', md: '2.4rem' } }}>
                        {isEditMode ? '게시글 수정' : '게시글 작성'}
                    </Typography>
                </Box>

                {/* 작성 카드 */}
                <Box sx={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)', bgcolor: 'rgba(255,255,255,0.02)', p: { xs: 3, md: 5 } }}>
                    <Box component="form" noValidate autoComplete="off">
                        {/* 제목 */}
                        <TextField
                            label="제목" fullWidth margin="normal" variant="outlined"
                            value={title} onChange={(e) => setTitle(e.target.value)} required
                            sx={{
                                mb: 4,
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '12px', color: '#f4f4f5',
                                    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
                                    '&.Mui-focused fieldset': { borderColor: '#818cf8' },
                                },
                                '& .MuiInputLabel-root': { color: '#71717a' },
                                '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
                            }}
                        />

                        {/* 기존 파일 목록 (수정 모드) */}
                        {isEditMode && existingFiles.length > 0 && (
                            <Box sx={{ mb: 4, p: 2.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <Typography sx={{ color: '#71717a', fontSize: '0.75rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', mb: 1.5 }}>
                                    기존 첨부파일
                                </Typography>
                                <List dense>
                                    {existingFiles.map((file, index) => (
                                        <ListItem key={file.uuid || file.imageURL || index}
                                            secondaryAction={
                                                <IconButton edge="end" size="small"
                                                    onClick={() => {
                                                        const fileId = file.uuid || file.imageURL;
                                                        if (fileId) {
                                                            setExistingFiles(prev => prev.filter((_, i) => i !== index));
                                                            setDeletedFileIds(prev => [...prev, fileId]);
                                                        }
                                                    }}
                                                    sx={{ color: '#52525b', '&:hover': { color: '#f87171' } }}>
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            }
                                            sx={{ borderRadius: '8px', mb: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                                            <ListItemText
                                                primary={`📎 ${file.fileName}`}
                                                secondary={`${file.type || '파일'}`}
                                                primaryTypographyProps={{ fontSize: '0.85rem', color: '#c4c4c8' }}
                                                secondaryTypographyProps={{ fontSize: '0.72rem', color: '#52525b' }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </Box>
                        )}

                        {/* 툴바 */}
                        <Box sx={{ mb: 3, p: 2.5, borderRadius: '12px', border: '1px solid rgba(255,255,255,0.07)', bgcolor: 'rgba(255,255,255,0.02)' }}>
                            <Stack direction="row" spacing={1} mb={2} alignItems="center" flexWrap="wrap" useFlexGap>
                                <Button variant="outlined" size="small" startIcon={<YouTubeIcon />}
                                    onClick={() => setOpenYoutubeDialog(true)}
                                    sx={{ borderRadius: '8px', borderColor: 'rgba(239,68,68,0.3)', color: '#f87171', textTransform: 'none', fontSize: '0.8rem', fontWeight: 600, '&:hover': { bgcolor: 'rgba(239,68,68,0.06)', borderColor: '#ef4444' } }}>
                                    YouTube
                                </Button>
                                <Button variant="outlined" size="small" startIcon={<MovieIcon />}
                                    onClick={() => videoInputRef.current.click()}
                                    sx={{ borderRadius: '8px', borderColor: 'rgba(52,211,153,0.3)', color: '#34d399', textTransform: 'none', fontSize: '0.8rem', fontWeight: 600, '&:hover': { bgcolor: 'rgba(52,211,153,0.06)', borderColor: '#34d399' } }}>
                                    내 동영상
                                </Button>
                                <Button component="label" variant="outlined" size="small" startIcon={<CloudUploadIcon />}
                                    sx={{ borderRadius: '8px', borderColor: 'rgba(129,140,248,0.3)', color: '#818cf8', textTransform: 'none', fontSize: '0.8rem', fontWeight: 600, '&:hover': { bgcolor: 'rgba(129,140,248,0.06)', borderColor: '#818cf8' } }}>
                                    파일 첨부
                                    <input type="file" multiple hidden onChange={handleFileChange} />
                                </Button>
                            </Stack>

                            {fileDTOs.length > 0 && (
                                <List dense sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)', mb: 2 }}>
                                    {fileDTOs.map((file, idx) => (
                                        <React.Fragment key={idx}>
                                            <ListItem
                                                secondaryAction={
                                                    <IconButton edge="end" size="small" onClick={() => handleRemoveFile(idx)}
                                                        sx={{ color: '#52525b', '&:hover': { color: '#f87171' } }}>
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                }>
                                                <ListItemText primary={`💾 ${file.fileName}`}
                                                    primaryTypographyProps={{ fontSize: '0.83rem', color: '#c4c4c8' }} />
                                            </ListItem>
                                            {idx < fileDTOs.length - 1 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />}
                                        </React.Fragment>
                                    ))}
                                </List>
                            )}

                            <Stack direction="column" spacing={0.3}>
                                <Typography sx={{ fontSize: '0.72rem', color: '#52525b' }}>
                                    💡 <strong style={{ color: '#71717a' }}>에디터 미디어 vs 파일 첨부</strong>
                                </Typography>
                                <Typography sx={{ fontSize: '0.72rem', color: '#52525b' }}>
                                    • <strong style={{ color: '#71717a' }}>YouTube/내 동영상</strong>: 본문에 직접 삽입 (재생 가능)
                                </Typography>
                                <Typography sx={{ fontSize: '0.72rem', color: '#52525b' }}>
                                    • <strong style={{ color: '#71717a' }}>파일 첨부</strong>: 다운로드 가능한 별도 첨부파일
                                </Typography>
                            </Stack>
                        </Box>

                        {/* Toast UI Editor */}
                        <Box sx={{ mb: 4, borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <Editor
                                ref={editorRef}
                                initialValue=" "
                                previewStyle="vertical"
                                height="600px"
                                initialEditType="wysiwyg"
                                useCommandShortcut={true}
                                plugins={[colorSyntax]}
                                customHTMLSanitizer={html => html}
                                widgetRules={[
                                    {
                                        rule: /@video\[(.*?)\]/,
                                        toDOM(text) {
                                            const rule = /@video\[(.*?)\]/;
                                            const matched = text.match(rule);
                                            if (!matched) return null;
                                            const div = document.createElement('div');
                                            div.className = 'widget-video';
                                            div.style.display = 'flex';
                                            div.style.justifyContent = 'center';
                                            div.style.backgroundColor = '#000';
                                            div.style.margin = '10px 0';
                                            div.style.borderRadius = '4px';
                                            const video = document.createElement('video');
                                            video.src = matched[1];
                                            video.style.maxWidth = '100%';
                                            video.controls = true;
                                            div.appendChild(video);
                                            return div;
                                        }
                                    }
                                ]}
                                hooks={{
                                    addImageBlobHook: async (blob, callback) => {
                                        const formData = new FormData();
                                        formData.append("uploadFiles", blob);
                                        try {
                                            setIsLoading(true);
                                            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/uploadAjax`, { method: 'POST', body: formData });
                                            const result = await res.json();
                                            if (result && result.length > 0) {
                                                let fileUrl = '';
                                                const fileType = result[0].type;
                                                if (result[0].imageURL) {
                                                    fileUrl = `${BACKEND_API_BASE_URL}/display?fileName=${result[0].imageURL}`;
                                                } else {
                                                    const { folderPath, uuid, fileName } = result[0];
                                                    const normalizedPath = folderPath.replace(/\\/g, '/');
                                                    const encodedPath = encodeURIComponent(`${normalizedPath}/${uuid}_${fileName}`);
                                                    fileUrl = `${BACKEND_API_BASE_URL}/display?fileName=${encodedPath}`;
                                                }
                                                if (fileType === 'VIDEO') {
                                                    const shortcode = `\n@video[${fileUrl}]\n`;
                                                    const editorInstance = editorRef.current?.getInstance();
                                                    editorInstance?.setMarkdown(editorInstance.getMarkdown() + shortcode);
                                                } else {
                                                    callback(fileUrl, 'image');
                                                }
                                            }
                                        } catch (e) {
                                            console.error("Upload Error:", e);
                                            alert("업로드 실패: " + e.message);
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }
                                }}
                            />
                        </Box>

                        <input type="file" ref={videoInputRef} style={{ display: 'none' }} accept="video/*" onChange={handleVideoChange} />

                        {/* 하단 버튼 */}
                        <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                            <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => navigate('/freeboard')}
                                sx={{ borderRadius: '10px', borderColor: 'rgba(255,255,255,0.1)', color: '#a1a1aa', textTransform: 'none', '&:hover': { borderColor: 'rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.03)' } }}>
                                취소
                            </Button>
                            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit}
                                sx={{ borderRadius: '10px', bgcolor: '#818cf8', color: '#fff', fontWeight: 700, textTransform: 'none', boxShadow: '0 0 20px rgba(129,140,248,0.2)', '&:hover': { bgcolor: '#6366f1' } }}>
                                {isEditMode ? '수정 완료' : '등록'}
                            </Button>
                        </Stack>
                    </Box>
                </Box>
            </Container>

            {/* YouTube Dialog */}
            <Dialog open={openYoutubeDialog} onClose={() => setOpenYoutubeDialog(false)}
                PaperProps={{ sx: { bgcolor: '#111116', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', color: '#f4f4f5' } }}>
                <Box sx={{ px: 3, pt: 3, pb: 1 }}>
                    <Typography fontWeight={700} fontSize="1.05rem" mb={2}>YouTube 동영상 삽입</Typography>
                    <TextField
                        autoFocus fullWidth label="YouTube 주소 (URL)" type="url" variant="outlined"
                        value={youtubeLinkInput} onChange={(e) => setYoutubeLinkInput(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        sx={{
                            mb: 2,
                            '& .MuiOutlinedInput-root': {
                                bgcolor: 'rgba(255,255,255,0.04)', borderRadius: '10px', color: '#f4f4f5',
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
                                '&.Mui-focused fieldset': { borderColor: '#818cf8' },
                            },
                            '& .MuiInputLabel-root': { color: '#71717a' },
                            '& .MuiInputLabel-root.Mui-focused': { color: '#818cf8' },
                        }}
                    />
                </Box>
                <Stack direction="row" spacing={1} justifyContent="flex-end" px={3} pb={3}>
                    <Button onClick={() => setOpenYoutubeDialog(false)}
                        sx={{ borderRadius: '9px', color: '#71717a', textTransform: 'none' }}>취소</Button>
                    <Button onClick={handleInsertYoutube} variant="contained"
                        sx={{ borderRadius: '9px', bgcolor: '#818cf8', textTransform: 'none', '&:hover': { bgcolor: '#6366f1' } }}>삽입</Button>
                </Stack>
            </Dialog>
        </Box>
    );
};

export default FreeBoardRegister;
