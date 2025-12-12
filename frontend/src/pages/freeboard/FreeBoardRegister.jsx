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
    IconButton,
    List,
    ListItem,
    ListItemText
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

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
    
    // Editor ref
    const editorRef = useRef();

    const handleFileChange = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
            formData.append("uploadFiles", files[i]);
        }

        try {
            const res = await fetch(`${BACKEND_API_BASE_URL}/uploadAjax`, {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const result = await res.json();
                setFileDTOs([...fileDTOs, ...result]);
            } else {
                alert("File Upload Failed");
            }
        } catch (e) {
            console.error(e);
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

        // Editor 내용 가져오기 (Markdown)
        const content = editorRef.current.getInstance().getMarkdown();
        if (!content.trim()) {
             alert("내용을 입력해주세요.");
             return;
        }

        const payload = { 
            title, 
            content, 
            fileDTOs 
        };
        
        try {
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
                console.error("Register Error:", res.status, errData);
            }
        } catch (e) {
            console.error("Network Error:", e);
            alert("네트워크 오류가 발생했습니다.");
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
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

                    {/* Toast UI Editor */}
                    <Box sx={{ mb: 3 }}>
                        <Editor
                            ref={editorRef}
                            initialValue=" "
                            previewStyle="vertical"
                            height="500px"
                            initialEditType="wysiwyg"
                            useCommandShortcut={true}
                            plugins={[colorSyntax]}
                        />
                    </Box>

                    {/* File Upload Section */}
                    <Box sx={{ mb: 3, p: 2, border: '1px dashed #ccc', borderRadius: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                            <Button
                                component="label"
                                variant="outlined"
                                startIcon={<CloudUploadIcon />}
                            >
                                파일 첨부
                                <input
                                    type="file"
                                    multiple
                                    hidden
                                    onChange={handleFileChange}
                                />
                            </Button>
                            <Typography variant="body2" color="textSecondary">
                                (이미지, 문서 등 첨부 가능)
                            </Typography>
                        </Stack>
                        
                        {fileDTOs.length > 0 && (
                            <List dense>
                                {fileDTOs.map((file, idx) => (
                                    <ListItem 
                                        key={idx}
                                        secondaryAction={
                                            <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFile(idx)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        }
                                        sx={{ bgcolor: '#f9f9f9', mb: 1, borderRadius: 1 }}
                                    >
                                        <ListItemText 
                                            primary={file.fileName} 
                                            primaryTypographyProps={{ variant: 'body2' }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>

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
        </Container>
    );
};

export default FreeBoardRegister;
