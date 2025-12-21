import { useState, useCallback } from 'react';
import { fetchWithAccess } from '../../../util/fetchUtil';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

export const useComments = (boardId) => {
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [editMode, setEditMode] = useState({ active: false, commentId: null, text: '' });
    const [replyMode, setReplyMode] = useState({ active: false, parentId: null });

    const fetchComments = useCallback(async () => {
        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${boardId}/comments`, {
                method: 'GET',
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (res.ok) {
                const data = await res.json();
                setComments(data);
            }
        } catch (error) {
            console.error('댓글 조회 오류:', error);
        }
    }, [boardId]);

    const handleCommentSubmit = useCallback(async () => {
        if (!commentText.trim()) {
            alert('댓글 내용을 입력하세요.');
            return;
        }

        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${boardId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    comment: commentText,
                    parentId: replyMode.active ? replyMode.parentId : null
                })
            });

            if (res.ok) {
                setCommentText('');
                setReplyMode({ active: false, parentId: null });
                await fetchComments();
            }
        } catch (error) {
            console.error('댓글 작성 오류:', error);
            alert('댓글 작성에 실패했습니다.');
        }
    }, [boardId, commentText, replyMode, fetchComments]);

    const handleCommentEdit = useCallback(async (commentId) => {
        if (!editMode.text.trim()) {
            alert('댓글 내용을 입력하세요.');
            return;
        }

        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${boardId}/comments/${commentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: editMode.text })
            });

            if (res.ok) {
                setEditMode({ active: false, commentId: null, text: '' });
                await fetchComments();
            }
        } catch (error) {
            console.error('댓글 수정 오류:', error);
            alert('댓글 수정에 실패했습니다.');
        }
    }, [boardId, editMode, fetchComments]);

    const handleCommentDelete = useCallback(async (commentId) => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return;

        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${boardId}/comments/${commentId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert('삭제되었습니다.');
                await fetchComments();
            }
        } catch (error) {
            console.error('댓글 삭제 오류:', error);
            alert('댓글 삭제에 실패했습니다.');
        }
    }, [boardId, fetchComments]);

    return {
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
    };
};
