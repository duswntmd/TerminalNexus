import React from 'react';
import {
    Box,
    Paper,
    Stack,
    Avatar,
    Typography,
    Chip,
    TextField,
    Button
} from '@mui/material';

// 재귀 댓글 컴포넌트 (무한 depth 지원)
const CommentItem = ({ 
    comment, 
    depth = 0, 
    editMode, 
    setEditMode, 
    replyMode, 
    setReplyMode, 
    handleCommentEdit, 
    handleCommentDelete 
}) => {
    return (
        <Box>
            <Paper 
                elevation={1} 
                sx={{ 
                    p: 2, 
                    ml: depth * 6, 
                    bgcolor: comment.isDeleted ? '#fafafa' : (depth === 0 ? '#ffffff' : '#f5f5f5')
                }}
            >
                <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Avatar sx={{ 
                        bgcolor: comment.isDeleted ? 'grey.400' : (depth === 0 ? 'primary.main' : 'secondary.main'),
                        width: depth === 0 ? 40 : 32, 
                        height: depth === 0 ? 40 : 32 
                    }}>
                        {comment.writerNickname?.charAt(0) || 'U'}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                            <Typography variant="subtitle2" fontWeight="bold" color={comment.isDeleted ? 'text.disabled' : 'text.primary'}>
                                {comment.writerNickname}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {new Date(
                                    comment.modDate !== comment.regDate ? comment.modDate : comment.regDate
                                ).toLocaleString('ko-KR')}
                            </Typography>
                            {!comment.isDeleted && comment.modDate !== comment.regDate && (
                                <Chip label="수정됨" size="small" variant="outlined" />
                            )}
                            {comment.isDeleted && (
                                <Chip label="삭제됨" size="small" color="default" />
                            )}
                        </Stack>

                        {/* 삭제된 댓글 */}
                        {comment.isDeleted ? (
                            <Typography variant={depth === 0 ? "body1" : "body2"} color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                삭제된 댓글입니다.
                            </Typography>
                        ) : (
                            <>
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
                                        <Typography variant={depth === 0 ? "body1" : "body2"} sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                                            {comment.comment}
                                        </Typography>
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
                                                    type="button"
                                                    size="small" 
                                                    color="error"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleCommentDelete(comment.id);
                                                    }}
                                                >
                                                    삭제
                                                </Button>
                                            )}
                                        </Stack>
                                    </>
                                )}
                            </>
                        )}
                    </Box>
                </Stack>
            </Paper>

            {/* 대댓글 재귀 렌더링 */}
            {comment.children && comment.children.length > 0 && (
                <Box sx={{ mt: 1 }}>
                    <Stack spacing={1}>
                        {comment.children.map((child) => (
                            <CommentItem
                                key={child.id}
                                comment={child}
                                depth={depth + 1}
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
            )}
        </Box>
    );
};

export default CommentItem;
