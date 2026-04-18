import React from 'react';
import {
    Box,
    Stack,
    Avatar,
    Typography,
    Chip,
    TextField,
    Button,
} from '@mui/material';

/* ── 다크 인풋 공통 SX ── */
const darkInputSx = {
    '& .MuiOutlinedInput-root': {
        bgcolor: 'rgba(255,255,255,0.04)',
        borderRadius: '10px',
        color: '#e4e4e7',
        '& fieldset': { borderColor: 'rgba(255,255,255,0.08)' },
        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
        '&.Mui-focused fieldset': { borderColor: '#818cf8' },
    },
    '& .MuiInputBase-input::placeholder': { color: '#52525b', opacity: 1 },
};

/* 재귀 댓글 컴포넌트 */
const CommentItem = ({
    comment,
    depth = 0,
    editMode,
    setEditMode,
    replyMode,
    setReplyMode,
    handleCommentEdit,
    handleCommentDelete,
}) => {
    const isDeleted = comment.isDeleted;
    const avatarColor = isDeleted
        ? 'rgba(255,255,255,0.05)'
        : depth === 0
            ? 'rgba(129,140,248,0.15)'
            : 'rgba(255,255,255,0.07)';

    return (
        <Box>
            <Box
                sx={{
                    p: { xs: 2, md: 2.5 },
                    ml: depth * 4,
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    bgcolor: isDeleted
                        ? 'rgba(255,255,255,0.01)'
                        : depth === 0
                            ? 'rgba(255,255,255,0.02)'
                            : 'rgba(255,255,255,0.015)',
                }}
            >
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    {/* 아바타 */}
                    <Avatar
                        sx={{
                            bgcolor: avatarColor,
                            color: isDeleted ? '#3f3f46' : depth === 0 ? '#818cf8' : '#71717a',
                            width: depth === 0 ? 36 : 30,
                            height: depth === 0 ? 36 : 30,
                            fontSize: depth === 0 ? '0.9rem' : '0.75rem',
                            fontWeight: 700,
                            border: isDeleted ? 'none' : depth === 0 ? '1px solid rgba(129,140,248,0.25)' : '1px solid rgba(255,255,255,0.07)',
                            flexShrink: 0,
                        }}
                    >
                        {comment.writerNickname?.charAt(0) || '?'}
                    </Avatar>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        {/* 작성자 + 날짜 */}
                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" sx={{ mb: 0.8 }}>
                            <Typography sx={{
                                fontWeight: 700,
                                fontSize: depth === 0 ? '0.88rem' : '0.82rem',
                                color: isDeleted ? '#3f3f46' : '#d4d4d8',
                            }}>
                                {comment.writerNickname}
                            </Typography>
                            <Typography sx={{ fontSize: '0.72rem', color: '#52525b' }}>
                                {new Date(comment.modDate !== comment.regDate ? comment.modDate : comment.regDate)
                                    .toLocaleString('ko-KR')}
                            </Typography>
                            {!isDeleted && comment.modDate !== comment.regDate && (
                                <Chip label="수정됨" size="small" variant="outlined"
                                    sx={{ height: 18, fontSize: '0.62rem', borderColor: 'rgba(255,255,255,0.1)', color: '#71717a' }} />
                            )}
                            {isDeleted && (
                                <Chip label="삭제됨" size="small"
                                    sx={{ height: 18, fontSize: '0.62rem', bgcolor: 'rgba(255,255,255,0.04)', color: '#3f3f46', border: '1px solid rgba(255,255,255,0.06)' }} />
                            )}
                        </Stack>

                        {/* 삭제된 댓글 */}
                        {isDeleted ? (
                            <Typography sx={{ color: '#3f3f46', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                삭제된 댓글입니다.
                            </Typography>
                        ) : (
                            <>
                                {/* 수정 모드 */}
                                {editMode.active && editMode.commentId === comment.id ? (
                                    <>
                                        <TextField
                                            fullWidth multiline rows={2}
                                            value={editMode.text}
                                            onChange={(e) => setEditMode({ ...editMode, text: e.target.value })}
                                            sx={{ ...darkInputSx, mb: 1 }}
                                        />
                                        <Stack direction="row" spacing={1}>
                                            <Button size="small" variant="contained"
                                                onClick={() => handleCommentEdit(comment.id)}
                                                sx={{ borderRadius: '8px', bgcolor: '#818cf8', color: '#fff', textTransform: 'none', fontSize: '0.78rem', '&:hover': { bgcolor: '#6366f1' } }}>
                                                저장
                                            </Button>
                                            <Button size="small"
                                                onClick={() => setEditMode({ active: false, commentId: null, text: '' })}
                                                sx={{ borderRadius: '8px', color: '#71717a', textTransform: 'none', fontSize: '0.78rem' }}>
                                                취소
                                            </Button>
                                        </Stack>
                                    </>
                                ) : (
                                    <>
                                        <Typography sx={{
                                            color: '#c4c4c8', fontSize: depth === 0 ? '0.9rem' : '0.85rem',
                                            mb: 1, whiteSpace: 'pre-wrap', lineHeight: 1.65,
                                        }}>
                                            {comment.comment}
                                        </Typography>
                                        <Stack direction="row" spacing={0.5}>
                                            <Button size="small"
                                                onClick={() => setReplyMode({ active: true, parentId: comment.id, parentNickname: comment.writerNickname })}
                                                sx={{ borderRadius: '7px', color: '#71717a', textTransform: 'none', fontSize: '0.75rem', px: 1.2, py: 0.4, minWidth: 'auto', '&:hover': { color: '#818cf8', bgcolor: 'rgba(129,140,248,0.06)' } }}>
                                                답글
                                            </Button>
                                            {comment.canEdit && (
                                                <Button size="small"
                                                    onClick={() => setEditMode({ active: true, commentId: comment.id, text: comment.comment })}
                                                    sx={{ borderRadius: '7px', color: '#71717a', textTransform: 'none', fontSize: '0.75rem', px: 1.2, py: 0.4, minWidth: 'auto', '&:hover': { color: '#a3a3a3', bgcolor: 'rgba(255,255,255,0.04)' } }}>
                                                    수정
                                                </Button>
                                            )}
                                            {comment.canDelete && (
                                                <Button size="small"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCommentDelete(comment.id); }}
                                                    sx={{ borderRadius: '7px', color: '#71717a', textTransform: 'none', fontSize: '0.75rem', px: 1.2, py: 0.4, minWidth: 'auto', '&:hover': { color: '#f87171', bgcolor: 'rgba(239,68,68,0.06)' } }}>
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
            </Box>

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
