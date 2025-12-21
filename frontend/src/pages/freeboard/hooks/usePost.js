import { useState, useCallback } from 'react';
import { fetchWithAccess } from '../../../util/fetchUtil';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

export const usePost = (id) => {
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchPost = useCallback(async () => {
        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}`);
            if (res.ok) {
                const data = await res.json();
                setPost(data);
            }
        } catch (error) {
            console.error('게시글 조회 오류:', error);
        } finally {
            setLoading(false);
        }
    }, [id]);

    const handleDelete = useCallback(async () => {
        if (!window.confirm('정말 삭제하시겠습니까?')) return false;

        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                alert('삭제되었습니다.');
                return true;
            }
        } catch (error) {
            console.error('삭제 오류:', error);
            alert('삭제에 실패했습니다.');
        }
        return false;
    }, [id]);

    const handleLike = useCallback(async () => {
        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}/like`, {
                method: 'POST'
            });

            if (res.ok) {
                await fetchPost();
            }
        } catch (error) {
            console.error('좋아요 오류:', error);
        }
    }, [id, fetchPost]);

    const handleDislike = useCallback(async () => {
        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}/dislike`, {
                method: 'POST'
            });

            if (res.ok) {
                await fetchPost();
            }
        } catch (error) {
            console.error('싫어요 오류:', error);
        }
    }, [id, fetchPost]);

    return {
        post,
        loading,
        fetchPost,
        handleDelete,
        handleLike,
        handleDislike
    };
};
