import { useEffect, useState } from "react";
import { fetchWithAccess } from "../util/fetchUtil";
import "./UserPage.css";

// .env로 부터 백엔드 URL 받아오기
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

function UserPage() {

    // 정보
    const [userInfo, setUserInfo] = useState(null);
    const [error, setError] = useState('');

    // 페이지 방문시 유저 정보 요청
    useEffect(() => {

        const userInfo = async () => {
            
            try {

                const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/user`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (!res.ok) throw new Error("유저 정보 불러오기 실패");

                const data = await res.json();
                setUserInfo(data);

            } catch (err) {
                setError("유저 정보를 불러오지 못했습니다.");
            }

        };

        userInfo();

    }, []);

    return (
        <div className="user-page">
            <div className="user-container">
                <h1>내 정보</h1>
                {error ? (
                    <p className="error-message">{error}</p>
                ) : (
                    <div className="user-info">
                        <div className="info-item">
                            <label>아이디</label>
                            <p>{userInfo?.username}</p>
                        </div>
                        <div className="info-item">
                            <label>닉네임</label>
                            <p>{userInfo?.nickname}</p>
                        </div>
                        <div className="info-item">
                            <label>이메일</label>
                            <p>{userInfo?.email}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserPage;