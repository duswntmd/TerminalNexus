import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchWithAccess } from '../../util/fetchUtil';
import './FreeBoard.css';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const FreeBoardList = () => {
    const [data, setData] = useState({ dtoList: [], pageList: [], page: 1, totalPage: 1 });
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const page = searchParams.get("page") || 1;

    useEffect(() => {
        fetchData(page);
    }, [page]);

    const fetchData = async (pageNum) => {
        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard?page=${pageNum}&size=10`, {
                method: 'GET'
            });
            if (!res.ok) throw new Error("Failed to fetch");
            const result = await res.json();
            setData(result);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="freeboard-container">
            <h1 className="freeboard-title">Free Board</h1>
            
            <div className="freeboard-actions">
                <button className="freeboard-action-btn" onClick={() => navigate('/freeboard/register')}>
                    Write New Post
                </button>
            </div>

            <table className="freeboard-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Writer</th>
                        <th>Date</th>
                        <th>Views</th>
                    </tr>
                </thead>
                <tbody>
                    {data.dtoList.map(dto => (
                        <tr key={dto.id}>
                            <td>{dto.id}</td>
                            <td><Link to={`/freeboard/${dto.id}`} style={{color: 'inherit', textDecoration: 'none'}}>{dto.title}</Link></td>
                            <td>{dto.writerNickname}</td>
                            <td>{new Date(dto.regDate).toLocaleDateString()}</td>
                            <td>{dto.viewCount}</td>
                        </tr>
                    ))}
                    {data.dtoList.length === 0 && (
                        <tr>
                            <td colSpan="5" style={{textAlign: 'center'}}>No posts found.</td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="pagination">
                {data.prev && <button className="page-btn" onClick={() => navigate(`/freeboard?page=${data.start - 1}`)}>&lt;</button>}
                {data.pageList.map(p => (
                    <button 
                        key={p} 
                        className={`page-btn ${data.page === p ? 'active' : ''}`}
                        onClick={() => navigate(`/freeboard?page=${p}`)}
                    >
                        {p}
                    </button>
                ))}
                {data.next && <button className="page-btn" onClick={() => navigate(`/freeboard?page=${data.end + 1}`)}>&gt;</button>}
            </div>
        </div>
    );
};

export default FreeBoardList;
