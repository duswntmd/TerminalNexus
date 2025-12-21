import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./LoginPage.css";

// .env로 부터 백엔드 URL 받아오기
const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;  // 일반 API용
const OAUTH2_BASE_URL = import.meta.env.VITE_OAUTH2_BASE_URL;  // OAuth2 전용

function LoginPage() {

    const navigate = useNavigate();
    const { login } = useAuth();
    const location = useLocation();

    // Redirect path logic
    const from = location.state?.from?.pathname || new URLSearchParams(location.search).get('redirect') || "/";

    // 자체 로그인시 username/password 변수
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    // 자체 로그인 이벤트
    const handleLogin = async (e) => {

        e.preventDefault();
        setError("");

        if (username === "" || password === "") {
            setError("아이디와 비밀번호를 입력하세요.");
            return;
        }

        // API 요청
        try {
            const res = await fetch(`${BACKEND_API_BASE_URL}/login`, {
                method: "POST",
                headers: {"Content-Type": "application/json",},
                credentials: "include",
                body: JSON.stringify({ username, password }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error("Login failed:", res.status, errorData);
                throw new Error(errorData.message || "로그인 실패");
            }

            const data = await res.json();
            
            // Context를 통해 로그인 상태 업데이트
            login(data.accessToken, data.refreshToken);
            
            // 로그인 성공 후 메인 페이지로 이동
            navigate(from, { replace: true });
            
        } catch (err) {
            console.error("Login error:", err);
            setError(err.message || "아이디 또는 비밀번호가 틀렸습니다.");
        }

    };

    // 소셜 로그인 이벤트
    const handleSocialLogin = (provider) => {
        // OAuth2는 브라우저 리다이렉트라서 절대 URL 필요!
        window.location.href = `${OAUTH2_BASE_URL}/oauth2/authorization/${provider}`;
    };

    // 페이지
    return (
        <div className="login-page">
            <div className="login-container">
                <h1>로그인</h1>

                <form onSubmit={handleLogin} className="login-form">
                    <div className="form-group">
                        <label>아이디</label>
                        <input
                            type="text"
                            placeholder="아이디"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>비밀번호</label>
                        <input
                            type="password"
                            placeholder="비밀번호"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <p className="error-message">{error}</p>}

                    <button type="submit" className="login-btn">계속</button>
                    
                    <div className="signup-link" style={{ marginTop: '15px', textAlign: 'center' }}>
                        <span style={{ color: '#666' }}>계정이 없으신가요? </span>
                        <a href="/join" style={{ color: '#007bff', textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer' }} onClick={(e) => {
                            e.preventDefault();
                            navigate('/join');
                        }}>회원가입</a>
                    </div>
                </form>

                <div className="divider">
                    <span>또는</span>
                </div>

                {/* 소셜 로그인 버튼 */}
                <div className="social-login">
                    <button onClick={() => handleSocialLogin("google")} className="social-btn google">
                        Google로 계속하기
                    </button>
                    <button onClick={() => handleSocialLogin("naver")} className="social-btn naver">
                        Naver로 계속하기
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LoginPage;