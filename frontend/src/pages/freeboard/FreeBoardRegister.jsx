import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import FormatAlignLeftIcon from '@mui/icons-material/FormatAlignLeft';
import FormatAlignCenterIcon from '@mui/icons-material/FormatAlignCenter';
import FormatAlignRightIcon from '@mui/icons-material/FormatAlignRight';

// Toast UI Editor
import { Editor } from '@toast-ui/react-editor';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor-plugin-color-syntax/dist/toastui-editor-plugin-color-syntax.css';
import colorSyntax from '@toast-ui/editor-plugin-color-syntax';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const FreeBoardRegister = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [fileDTOs, setFileDTOs] = useState([]); 
    const [isLoading, setIsLoading] = useState(false); 
    
    // YouTube Dialog State
    const [openYoutubeDialog, setOpenYoutubeDialog] = useState(false);
    const [youtubeLinkInput, setYoutubeLinkInput] = useState('');

    const editorRef = useRef();
    const videoInputRef = useRef(); 

    // --- Alignment Logic ---
    const handleAlign = (alignType) => {
        const editorInstance = editorRef.current?.getInstance();
        if(!editorInstance) return;
        
        const selection = editorInstance.getSelectedText();
        const contentByAlign = selection ? selection : '&nbsp;'; 
        const html = `\n<div align="${alignType}">${contentByAlign}</div>\n`;
        editorInstance.setMarkdown(editorInstance.getMarkdown() + html);
    };

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

        const payload = { 
            title, 
            content, 
            fileDTOs: fileDTOs 
        };
        
        try {
            setIsLoading(true);
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                navigate('/freeboard');
            } else {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData.message || `등록 실패 (${res.status})`;
                alert(errMsg);
            }
        } catch (e) {
            console.error("Network Error:", e);
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
                게시글 작성
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

                            <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                            <Tooltip title="왼쪽 정렬">
                                <IconButton size="small" onClick={() => handleAlign('left')}>
                                    <FormatAlignLeftIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="가운데 정렬">
                                <IconButton size="small" onClick={() => handleAlign('center')}>
                                    <FormatAlignCenterIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="오른쪽 정렬">
                                <IconButton size="small" onClick={() => handleAlign('right')}>
                                    <FormatAlignRightIcon />
                                </IconButton>
                            </Tooltip>
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
                         <Typography variant="caption" color="text.secondary" >
                             ※ [내 동영상] 버튼을 누르면 업로드 후 에디터 내에서 바로 재생됩니다.
                        </Typography>
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
