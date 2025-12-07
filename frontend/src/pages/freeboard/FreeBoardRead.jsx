import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWithAccess } from '../../util/fetchUtil';
import './FreeBoard.css';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const FreeBoardRead = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}`, { method: 'GET' });
                if (res.ok) {
                    setPost(await res.json());
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

    if (!post) return <div className="freeboard-container">Loading...</div>;

    const handleDelete = async () => {
        if (!window.confirm("Delete this post?")) return;
        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard/${id}`, { method: 'DELETE' });
            if (res.ok) {
                navigate('/freeboard');
            } else {
                alert("Failed to delete (Are you the owner?)");
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="freeboard-container">
            <h1 className="freeboard-title">{post.title}</h1>
            <div className="read-meta">
                <span>Writer: {post.writerNickname}</span>
                <span>Date: {new Date(post.regDate).toLocaleString()}</span>
                <span>Views: {post.viewCount}</span>
            </div>
            <div className="read-content">
                {post.content}
            </div>

            {post.fileDTOs && post.fileDTOs.length > 0 && (
                <div className="read-files">
                    {post.fileDTOs.map((file, idx) => (
                        <div key={idx} className="file-item">
                            {file.type === 'IMAGE' ? (
                                <img 
                                    src={`${BACKEND_API_BASE_URL}/display?fileName=${file.imageURL}`} 
                                    alt={file.fileName} 
                                    style={{maxWidth: '100%', marginBottom: '10px'}}
                                />
                            ) : (
                                <video 
                                    src={`${BACKEND_API_BASE_URL}/display?fileName=${file.imageURL}`} 
                                    controls 
                                    style={{maxWidth: '100%', marginBottom: '10px'}}
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
            
            <button className="freeboard-action-btn" onClick={() => navigate('/freeboard')}>List</button>
            
            {/* Owner checks could be improved by comparing with logged in user info context */}
            <button className="freeboard-action-btn" style={{marginLeft: '10px', backgroundColor: '#aa0000', borderColor: '#ff0000'}} onClick={handleDelete}>Delete</button>
        </div>
    );
};

export default FreeBoardRead;
