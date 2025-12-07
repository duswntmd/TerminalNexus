import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAccess } from '../../util/fetchUtil';
import './FreeBoard.css';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const FreeBoardRegister = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({ title: '', content: '' });
    const [fileDTOs, setFileDTOs] = useState([]);

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
                // No headers for multipart/form-data, let browser set boundary
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = { ...form, fileDTOs: fileDTOs };
        
        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                navigate('/freeboard');
            } else {
                alert("Failed to register post");
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="freeboard-container">
            <h1 className="freeboard-title">Write Post</h1>
            
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Title</label>
                    <input 
                        type="text" 
                        className="form-control"
                        value={form.title}
                        onChange={e => setForm({...form, title: e.target.value})}
                        required 
                    />
                </div>
                <div className="form-group">
                    <label>Content</label>
                    <textarea 
                        className="form-control"
                        rows="10"
                        value={form.content}
                        onChange={e => setForm({...form, content: e.target.value})}
                        required
                    ></textarea>
                </div>
                
                <div className="form-group">
                     <label>Attach Files (Images/Videos)</label>
                     <input type="file" multiple onChange={handleFileChange} className="form-control" />
                     {fileDTOs.length > 0 && (
                         <div style={{marginTop: '10px'}}>
                             {fileDTOs.map((file, idx) => (
                                 <div key={idx} style={{color: '#aaa', fontSize: '0.9rem'}}>
                                     ✓ {file.fileName}
                                 </div>
                             ))}
                         </div>
                     )}
                </div>

                <button type="submit" className="freeboard-action-btn">Register</button>
                <button type="button" className="freeboard-action-btn" style={{marginLeft: '10px', background: '#444', borderColor: '#666'}} onClick={() => navigate(-1)}>Cancel</button>
            </form>
        </div>
    );
};

export default FreeBoardRegister;
