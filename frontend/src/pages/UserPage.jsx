import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAccess } from "../util/fetchUtil";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from 'react-i18next';
import "./UserPage.css";

// .env로 부터 백엔드 URL 받아오기
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

function UserPage() {
    // 정보
    const [userInfo, setUserInfo] = useState(null);
    const [error, setError] = useState('');
    
    // Auth
    const { logout } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ nickname: '', email: '', currentPassword: '', password: '', confirmPassword: '' });

    // ... (useEffect omitted)

    const toggleEdit = () => {
        setIsEditing(!isEditing);
        if (!isEditing && userInfo) {
            setEditForm({ nickname: userInfo.nickname || '', email: userInfo.email || '', currentPassword: '', password: '', confirmPassword: '' });
        }
    };

    const handleUpdate = async () => {
        if (!userInfo) return;
        
        // 비밀번호 변경 시 확인
        if (editForm.password && editForm.password !== editForm.confirmPassword) {
            setError("새 비밀번호가 일치하지 않습니다.");
            return;
        }

        try {
            const token = localStorage.getItem("accessToken");
            // PUT /user expects: username, nickname, email, etc.
            // We must send username as well for the Service check
            const body = {
                username: userInfo.username,
                nickname: editForm.nickname,
                email: editForm.email,
                password: editForm.password,
                currentPassword: editForm.currentPassword 
            };

            const res = await fetch(`${BACKEND_API_BASE_URL}/user`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                alert("회원 정보가 수정되었습니다.");
                setUserInfo({ ...userInfo, nickname: editForm.nickname, email: editForm.email });
                setIsEditing(false);
                setError("");
            } else {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData.message || `수정 실패 (${res.status})`;
                setError(errMsg);
            }
        } catch (err) {
            setError("정보 수정 중 오류 발생: " + err.message);
        }
    };

    const handleWithdrawal = async () => {
        if (!userInfo) return;

        if (!confirm(t('user.withdraw_confirm'))) {
            return;
        }

        try {
            const token = localStorage.getItem("accessToken");
            const res = await fetch(`${BACKEND_API_BASE_URL}/user`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ username: userInfo.username }),
            });

            if (res.ok) {
                alert(t('user.withdraw_success'));
                logout();
                navigate('/');
            } else {
                const errData = await res.json().catch(() => ({}));
                const errMsg = errData.message || `${t('user.withdraw_fail')} (${res.status})`;
                setError(errMsg); 
            }
        } catch (err) {
            setError(t('user.withdraw_error') + err.message);
            console.error(err);
        }
    };

    if (!userInfo) return <div className="user-page">Loading...</div>;

    return (
        <div className="user-page">
            <div className="user-container">
                <h1>{t('user.title')}</h1>
                {error && <p className="error-message">{error}</p>}
                
                {!error && (
                    <>
                        <div className="user-info">
                            <div className="info-item">
                                <label>{t('user.username')}</label>
                                <p>{userInfo?.username}</p>
                            </div>
                            
                            <div className="info-item">
                                <label>{t('user.nickname')}</label>
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        className="edit-input"
                                        value={editForm.nickname}
                                        onChange={(e) => setEditForm({...editForm, nickname: e.target.value})}
                                    />
                                ) : (
                                    <p>{userInfo?.nickname}</p>
                                )}
                            </div>

                            <div className="info-item">
                                <label>{t('user.email')}</label>
                                {isEditing ? (
                                    <input 
                                        type="email" 
                                        className="edit-input"
                                        value={editForm.email}
                                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                                    />
                                ) : (
                                    <p>{userInfo?.email}</p>
                                )}
                            </div>
                            
                            {isEditing && (
                                <>
                                    <div className="info-item">
                                        <label>{t('user.password_current') || "Current Password"}</label>
                                        <input 
                                            type="password" 
                                            className="edit-input"
                                            placeholder="현재 비밀번호 (변경 시 필수)"
                                            value={editForm.currentPassword || ''}
                                            onChange={(e) => setEditForm({...editForm, currentPassword: e.target.value})}
                                        />
                                    </div>
                                    <div className="info-item">
                                        <label>{t('user.password_new') || "New Password"}</label>
                                        <input 
                                            type="password" 
                                            className="edit-input"
                                            placeholder="새로운 비밀번호"
                                            value={editForm.password || ''}
                                            onChange={(e) => setEditForm({...editForm, password: e.target.value})}
                                        />
                                    </div>
                                    <div className="info-item">
                                        <label>{t('user.password_confirm') || "Confirm Password"}</label>
                                        <input 
                                            type="password" 
                                            className="edit-input"
                                            placeholder="비밀번호 확인"
                                            value={editForm.confirmPassword || ''}
                                            onChange={(e) => setEditForm({...editForm, confirmPassword: e.target.value})}
                                        />
                                        {editForm.password && editForm.confirmPassword && editForm.password !== editForm.confirmPassword && (
                                            <p className="validation-msg error" style={{color: 'red', fontSize: '0.8rem', marginTop: '5px'}}>비밀번호가 일치하지 않습니다.</p>
                                        )}
                                    </div>
                                </>
                            )}

                            <div className="mt-4 action-buttons">
                                {isEditing ? (
                                    <>
                                        <button onClick={handleUpdate} className="btn-save">저장</button>
                                        <button onClick={toggleEdit} className="btn-cancel">취소</button>
                                    </>
                                ) : (
                                    <button onClick={toggleEdit} className="btn-edit">정보 수정</button>
                                )}
                            </div>
                            
                            <div className="mt-2">
                                <button onClick={handleWithdrawal} className="btn-withdraw">
                                    {t('user.withdraw_btn')}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default UserPage;