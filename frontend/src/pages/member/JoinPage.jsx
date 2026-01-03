import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
    Container, 
    Typography, 
    TextField, 
    Button, 
    Box, 
    Paper, 
    CircularProgress,
    Alert
} from '@mui/material';

// .env로 부터 백엔드 URL 받아오기
const BACKEND_API_BASE_URL = ''; // Vite 프록시 사용


const JoinPage = () => {

    const navigate = useNavigate();

    // 입력 데이터 상태 관리
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        nickname: "",
        email: ""
    });

    // 유효성 검사 상태 (null: 검사 전, true: 사용 가능, false: 중복/불가, "error": 에러)
    const [validity, setValidity] = useState({
        username: null,
        nickname: null
    });

    // 로딩 상태
    const [loading, setLoading] = useState({
        username: false,
        nickname: false,
        submit: false
    });

    // 에러 메시지
    const [errorMsg, setErrorMsg] = useState("");

    // 입력 핸들러
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // 입력 변경 시 해당 필드의 유효성 초기화 (username, nickname만)
        if (name === "username" || name === "nickname") {
            setValidity(prev => ({ ...prev, [name]: null }));
        }
    };

    // 아이디 중복 확인 (Debounce 적용)
    useEffect(() => {
        const { username } = formData;
        if (username.length < 4) {
            setValidity(prev => ({ ...prev, username: null }));
            return;
        }

        const checkUsername = async () => {
            setLoading(prev => ({ ...prev, username: true }));
            try {
                const res = await fetch(`${BACKEND_API_BASE_URL}/api/user/exist`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username }),
                });
                
                if (res.ok) {
                    const exists = await res.json();
                    setValidity(prev => ({ ...prev, username: !exists }));
                } else {
                    setValidity(prev => ({ ...prev, username: "server_error" }));
                }
            } catch (error) {
                console.error("Username check failed", error);
                setValidity(prev => ({ ...prev, username: "network_error" }));
            } finally {
                setLoading(prev => ({ ...prev, username: false }));
            }
        };

        const timer = setTimeout(checkUsername, 500);
        return () => clearTimeout(timer);

    }, [formData.username]);

    // 닉네임 중복 확인 (Debounce 적용)
    useEffect(() => {
        const { nickname } = formData;
        if (nickname.trim() === "") {
            setValidity(prev => ({ ...prev, nickname: null }));
            return;
        }

        const checkNickname = async () => {
            setLoading(prev => ({ ...prev, nickname: true }));
            try {
                const res = await fetch(`${BACKEND_API_BASE_URL}/api/user/exist/nickname`, {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ nickname }) 
                });
                
                if(res.ok) {
                    const exists = await res.json();
                    setValidity(prev => ({ ...prev, nickname: !exists }));
                } else {
                    setValidity(prev => ({ ...prev, nickname: "server_error" }));
                }
            } catch (error) {
                console.error("Nickname check failed", error);
                setValidity(prev => ({ ...prev, nickname: "network_error" }));
            } finally {
                setLoading(prev => ({ ...prev, nickname: false }));
            }
        }

        const timer = setTimeout(checkNickname, 500);
        return () => clearTimeout(timer);
    }, [formData.nickname]);


    // 회원가입 요청
    const handleSignUp = async () => {
        const { username, password, nickname, email } = formData;

        if (username.length < 4 || password.length < 4 || !nickname || !email) {
            setErrorMsg("모든 항목을 입력해주세요. (ID/PW 4자 이상)");
            return;
        }

        if (validity.username !== true || validity.nickname !== true) {
            setErrorMsg("아이디 또는 닉네임 중복 확인이 필요합니다.");
            return;
        }

        setLoading(prev => ({ ...prev, submit: true }));
        setErrorMsg("");

        try {
            const res = await fetch(`${BACKEND_API_BASE_URL}/api/user`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                throw new Error("회원가입 실패");
            }

            // 성공 시 로그인 페이지로 이동
            alert("회원가입이 완료되었습니다!");
            navigate("/login");

        } catch (error) {
            console.error(error);
            setErrorMsg("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
        } finally {
            setLoading(prev => ({ ...prev, submit: false }));
        }
    };

    // Helper Text 생성
    const getUsernameHelperText = () => {
        if (loading.username) return "중복 확인 중...";
        if (formData.username.length > 0 && formData.username.length < 4) return "4자 이상 입력해주세요.";
        if (validity.username === true) return "사용 가능한 아이디입니다.";
        if (validity.username === false) return "이미 사용 중인 아이디입니다.";
        if (validity.username === "server_error") return "서버 오류로 확인 불가합니다.";
        if (validity.username === "network_error") return "네트워크 오류로 확인 불가합니다.";
        return "";
    };

    const getNicknameHelperText = () => {
        if (loading.nickname) return "중복 확인 중...";
        if (validity.nickname === true) return "사용 가능한 닉네임입니다.";
        if (validity.nickname === false) return "이미 사용 중인 닉네임입니다.";
        if (validity.nickname === "server_error") return "서버 오류로 확인 불가합니다.";
        if (validity.nickname === "network_error") return "네트워크 오류로 확인 불가합니다.";
        return "";
    };

    const isSubmitDisabled = 
        loading.submit || 
        validity.username !== true || 
        validity.nickname !== true || 
        formData.password.length < 4 || 
        !formData.email;

    const isError = (validityValue) => {
        return validityValue === false || validityValue === "server_error" || validityValue === "network_error";
    };

    return (
        <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
                    <Typography component="h1" variant="h5" fontWeight="bold">
                        회원 가입
                    </Typography>
                </Box>

                <Box component="form" noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="username"
                        label="아이디"
                        name="username"
                        autoComplete="username"
                        autoFocus
                        value={formData.username}
                        onChange={handleChange}
                        error={isError(validity.username) || (formData.username.length > 0 && formData.username.length < 4)}
                        helperText={getUsernameHelperText()}
                        color={validity.username === true ? "success" : (isError(validity.username) ? "error" : "primary")}
                        InputProps={{
                            endAdornment: loading.username ? <CircularProgress size={20} /> : null
                        }}
                    />
                    
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="비밀번호"
                        type="password"
                        id="password"
                        autoComplete="new-password"
                        value={formData.password}
                        onChange={handleChange}
                        helperText={formData.password.length > 0 && formData.password.length < 4 ? "4자 이상 입력해주세요." : ""}
                        error={formData.password.length > 0 && formData.password.length < 4}
                    />

                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="nickname"
                        label="닉네임"
                        id="nickname"
                        value={formData.nickname}
                        onChange={handleChange}
                        error={isError(validity.nickname)}
                        helperText={getNicknameHelperText()}
                        color={validity.nickname === true ? "success" : (isError(validity.nickname) ? "error" : "primary")}
                        InputProps={{
                            endAdornment: loading.nickname ? <CircularProgress size={20} /> : null
                        }}
                    />

                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="email"
                        label="이메일"
                        type="email"
                        id="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleChange}
                    />

                    {errorMsg && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {errorMsg}
                        </Alert>
                    )}

                    <Button
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2, height: 50, fontSize: '1.1rem', fontWeight: 'bold' }}
                        onClick={handleSignUp}
                        disabled={isSubmitDisabled}
                    >
                        {loading.submit ? <CircularProgress size={24} color="inherit" /> : "회원가입"}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default JoinPage;
