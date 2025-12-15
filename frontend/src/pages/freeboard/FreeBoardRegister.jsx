import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchWithAccess } from '../../util/fetchUtil';
import { 
    Container, 
    Typography, 
    TextField, 
    Button, 
    Box, 
    Paper, 
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Divider,
    Backdrop,
    CircularProgress,
    Tooltip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import YouTubeIcon from '@mui/icons-material/YouTube';
import MovieIcon from '@mui/icons-material/Movie';

// Toast UI Editor
import { Editor } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor-plugin-color-syntax/dist/toastui-editor-plugin-color-syntax.css';
import colorSyntax from '@toast-ui/editor-plugin-color-syntax';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const FreeBoardRegister = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // 수정 모드인지 체크
    const isEditMode = !!id;
    
    const [title, setTitle] = useState('');
    const [fileDTOs, setFileDTOs] = useState([]); 
    const [isLoading, setIsLoading] = useState(false); 
    const [existingFiles, setExistingFiles] = useState([]); // 기존 파일 목록
    const [deletedFileIds, setDeletedFileIds] = useState([]); // 삭제된 파일 ID
    
    // YouTube Dialog State
    const [openYoutubeDialog, setOpenYoutubeDialog] = useState(false);
    const [youtubeLinkInput, setYoutubeLinkInput] = useState('');

    const editorRef = useRef();
    const videoInputRef = useRef(); 

    // 수정 모드일 때 기존 데이터 로드
    useEffect(() => {
        if (isEditMode) {
            const fetchPost = async () => {
                try {
                    const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}`, { method: 'GET' });
                    if (res.ok) {
                        const data = await res.json();
                        console.log('📄 불러온 게시글 데이터:', data); // 디버깅용
                        setTitle(data.title);
                        if (editorRef.current) {
                            editorRef.current.getInstance().setMarkdown(data.content || '');
                        }
                        // 기존 파일 목록 저장
                        if (data.fileDTOs) {
                            const files = data.fileDTOs.filter(f => f.type !== 'YOUTUBE');
                            console.log('📎 기존 첨부파일:', files); // 디버깅용
                            setExistingFiles(files);
                        }
                    } else {
                        alert("게시글을 불러올 수 없습니다.");
                        navigate('/freeboard');
                    }
                } catch (e) {
                    console.error('❌ 게시글 로드 오류:', e);
                    alert("오류가 발생했습니다.");
                    navigate('/freeboard');
                }
            };
            fetchPost();
        }
    }, [id, isEditMode, navigate]);
 

    // --- YouTube Logic ---
    const handleInsertYoutube = () => {
        if (!youtubeLinkInput.trim()) {
            setOpenYoutubeDialog(false);
            return;
        }

        let videoId = '';
        if (youtubeLinkInput.includes('v=')) {
            videoId = youtubeLinkInput.split('v=')[1];
            const ampersandPosition = videoId.indexOf('&');
            if(ampersandPosition !== -1) {
                videoId = videoId.substring(0, ampersandPosition);
            }
        } else if (youtubeLinkInput.includes('youtu.be/')) {
           videoId = youtubeLinkInput.split('youtu.be/')[1];
        }

        if (!videoId) {
             alert("올바른 YouTube 주소가 아닙니다.");
             return;
        }

        const shortcode = `\n![youtube_video](https://img.youtube.com/vi/${videoId}/0.jpg)\n`;
        const editorInstance = editorRef.current?.getInstance();
        if(editorInstance) {
            editorInstance.setMarkdown(editorInstance.getMarkdown() + shortcode);
        }
        
        setYoutubeLinkInput('');
        setOpenYoutubeDialog(false);
    };

    // --- Local Video Upload Logic ---
    const handleVideoChange = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsLoading(true); 

        const formData = new FormData();
        formData.append("uploadFiles", files[0]); 

        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/uploadAjax`, {
                method: 'POST',
                body: formData
            });
            
            if(!res.ok) throw new Error(`Upload Failed: ${res.status}`);

            const result = await res.json();
            
            if (result && result.length > 0) {
                 const { folderPath, uuid, fileName } = result[0];
                 const normalizedPath = folderPath.replace(/\\/g, '/'); 
                 const encodedPath = encodeURIComponent(`${normalizedPath}/${uuid}_${fileName}`);
                 const fileUrl = `${BACKEND_API_BASE_URL}/display?fileName=${encodedPath}`;

                 // Use Shortcode which widgetRules will render as Player
                 const shortcode = `\n@video[${fileUrl}]\n`;
                 const editorInstance = editorRef.current?.getInstance();
                 if (editorInstance) {
                    editorInstance.setMarkdown(editorInstance.getMarkdown() + shortcode);
                 }
            } else {
                throw new Error("No response data");
            }
        } catch (err) {
            console.error(err);
            alert("동영상 업로드 실패: " + err.message);
        } finally {
            if(videoInputRef.current) videoInputRef.current.value = '';
            setIsLoading(false); 
        }
    };

    // --- Generic File Attachment Logic ---
    const handleFileChange = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsLoading(true);

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append("uploadFiles", files[i]);
        }

        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/uploadAjax`, {
                method: 'POST',
                body: formData
            });
            if(!res.ok) throw new Error("Upload Failed");
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
        if (!title.trim()) {
            alert("제목을 입력해주세요.");
            return;
        }
        const content = editorRef.current.getInstance().getMarkdown();
        if (!content.trim()) {
             alert("내용을 입력해주세요.");
             return;
        }

        // deletedFileIds에서 유효한 값만 필터링
        const validDeletedFileIds = deletedFileIds.filter(id => id && id.trim() !== '');

        const payload = { 
            title, 
            content, 
            fileDTOs: fileDTOs,
            ...(isEditMode && validDeletedFileIds.length > 0 && { deletedFileIds: validDeletedFileIds })
        };
        
        console.log('💾 전송할 데이터:', {
            mode: isEditMode ? '수정' : '등록',
            payload,
            새파일개수: fileDTOs.length,
            삭제된파일개수: validDeletedFileIds.length,
            삭제된파일IDs: validDeletedFileIds
        });
        
        try {
            setIsLoading(true);
            const url = isEditMode 
                ? `${BACKEND_API_BASE_URL}/freeboard/${id}` 
                : `${BACKEND_API_BASE_URL}/freeboard`;
            const method = isEditMode ? 'PUT' : 'POST';
            
            const res = await fetchWithAccess(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (res.ok) {
                console.log('✅ 성공:', isEditMode ? '수정완료' : '등록완료');
                if (isEditMode) {
                    navigate(`/freeboard/${id}`);
                } else {
                    navigate('/freeboard');
                }
            } else {
                const errData = await res.json().catch(() => ({}));
                console.error('❌ 서버 응답 오류:', {
                    status: res.status,
                    statusText: res.statusText,
                    errorData: errData
                });
                const errMsg = errData.message || errData.error || `${isEditMode ? '수정' : '등록'} 실패 (${res.status})`;
                alert(`오류: ${errMsg}\n\n자세한 내용은 콘솔을 확인하세요.`);
            }
        } catch (e) {
            console.error("❌ Network Error:", e);
            alert("네트워크 오류가 발생했습니다.");
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 999 }}
                open={isLoading}
            >
                <CircularProgress color="inherit" />
            </Backdrop>

            <Typography variant="h4" fontWeight="bold" gutterBottom>
                {isEditMode ? '게시글 수정' : '게시글 작성'}
            </Typography>

            <Paper elevation={3} sx={{ p: 4, mt: 2 }}>
                <Box component="form" noValidate autoComplete="off">
                    <TextField
                        label="제목"
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        sx={{ mb: 3, backgroundColor: '#fff' }}
                    />

                    {/* 기존 파일 목록 (수정 모드일 때만 표시) */}
                    {isEditMode && existingFiles.length > 0 && (
                        <Box sx={{ mb: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 2 }}>
                            <Typography variant="h6" gutterBottom fontWeight="bold">
                                기존 첨부 파일
                            </Typography>
                            <List>
                                {existingFiles.map((file, index) => (
                                    <ListItem
                                        key={file.uuid || file.imageURL || index}
                                        secondaryAction={
                                            <IconButton 
                                                edge="end" 
                                                onClick={() => {
                                                    console.log('🗑️ 삭제할 파일:', file);
                                                    // uuid 또는 imageURL을 사용하여 삭제
                                                    const fileId = file.uuid || file.imageURL;
                                                    
                                                    if (fileId) {
                                                        console.log('📌 FileId:', fileId);
                                                        setExistingFiles(prev => prev.filter((f, i) => i !== index));
                                                        setDeletedFileIds(prev => [...prev, fileId]);
                                                    } else {
                                                        console.error('❌ 파일 ID를 찾을 수 없습니다:', file);
                                                        alert('파일 ID를 찾을 수 없습니다.');
                                                    }
                                                }}
                                                color="error"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        }
                                        sx={{ bgcolor: 'white', mb: 1, borderRadius: 1 }}
                                    >
                                        <ListItemText 
                                            primary={file.fileName} 
                                            secondary={`타입: ${file.type || '파일'}`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}

                    {/* Toolbar */}
                    <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1, bgcolor: '#fafafa' }}>
                         <Stack direction="row" spacing={1} mb={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Button 
                                variant="outlined" 
                                size="small" 
                                color="error" 
                                startIcon={<YouTubeIcon />}
                                onClick={() => setOpenYoutubeDialog(true)}
                                sx={{ fontWeight: 'bold' }}
                            >
                                YouTube
                            </Button>

                            <Button 
                                variant="outlined" 
                                size="small" 
                                color="success" 
                                startIcon={<MovieIcon />}
                                onClick={() => videoInputRef.current.click()}
                                sx={{ fontWeight: 'bold' }}
                            >
                                내 동영상
                            </Button>

                            <Button
                                component="label"
                                variant="outlined"
                                size="small"
                                color="info"
                                startIcon={<CloudUploadIcon />}
                                sx={{ fontWeight: 'bold' }}
                            >
                                파일 첨부
                                <input
                                    type="file"
                                    multiple
                                    hidden
                                    onChange={handleFileChange}
                                />
                            </Button>

                        </Stack>
                        
                        {/* Attached File List */}
                        {fileDTOs.length > 0 && (
                            <List dense sx={{ mt: 1, bgcolor: 'white', border: '1px solid #eee', borderRadius: 1 }}>
                                {fileDTOs.map((file, idx) => (
                                    <React.Fragment key={idx}>
                                        <ListItem 
                                            secondaryAction={
                                                <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFile(idx)} size="small">
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            }
                                        >
                                            <ListItemText 
                                                primary={`💾 ${file.fileName}`} 
                                                primaryTypographyProps={{ variant: 'body2', color: 'text.primary' }}
                                            />
                                        </ListItem>
                                        {idx < fileDTOs.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                        <Stack direction="column" spacing={0.5} sx={{ mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                                ※ [내 동영상] 버튼을 누르면 업로드 후 에디터 내에서 바로 재생됩니다.
                            </Typography>
                        </Stack>
                    </Box>

                    {/* Toast UI Editor */}
                    <Box sx={{ mb: 3 }}>
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
                                        const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/uploadAjax`, {
                                            method: 'POST',
                                            body: formData
                                        });

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
                                                // Matches widgetRule pattern
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

                    {/* Hidden Video Input */}
                    <input 
                        type="file" 
                        ref={videoInputRef} 
                        style={{ display: 'none' }} 
                        accept="video/*"
                        onChange={handleVideoChange}
                    />

                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button 
                            variant="outlined" 
                            color="inherit" 
                            startIcon={<CancelIcon />}
                            onClick={() => navigate('/freeboard')}
                        >
                            취소
                        </Button>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            startIcon={<SaveIcon />}
                            onClick={handleSubmit}
                        >
                            등록
                        </Button>
                    </Stack>
                </Box>
            </Paper>
            
            {/* YouTube Link Dialog */}
            <Dialog open={openYoutubeDialog} onClose={() => setOpenYoutubeDialog(false)}>
                <DialogTitle>YouTube 동영상 삽입</DialogTitle>
                <DialogContent sx={{ minWidth: 400 }}>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="youtubeLink"
                        label="YouTube 주소 (URL)"
                        type="url"
                        fullWidth
                        variant="standard"
                        value={youtubeLinkInput}
                        onChange={(e) => setYoutubeLinkInput(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenYoutubeDialog(false)}>취소</Button>
                    <Button onClick={handleInsertYoutube}>삽입</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default FreeBoardRegister;
