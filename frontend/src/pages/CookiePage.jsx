import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// .env로 부터 백엔드 URL 받아오기
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

function CookiePage() {

    const { login } = useAuth();
    const navigate = useNavigate();

    // 페이지 접근시 (백엔드에서 리디렉션으로 여기로 보내면, 실행)
    useEffect(() => {

        const cookieToBody = async () => {

            // 요청
            try {

                const res = await fetch(`${BACKEND_API_BASE_URL}/jwt/exchange`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                });

                if (!res.ok) throw new Error("인증 실패");

                const data = await res.json();
                
                // Context 로그인 처리
                login(data.accessToken, data.refreshToken);

                navigate("/");

            } catch (err) {
                alert("소셜 로그인 실패");
                navigate("/login");
            }

        };

        cookieToBody();

    }, [navigate]);

    return (
        <p>로그인 처리 중입니다...</p>
    );
}

export default CookiePage;