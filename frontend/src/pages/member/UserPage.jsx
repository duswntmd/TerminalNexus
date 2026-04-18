import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAccess } from "../../util/fetchUtil";
import { useAuth } from "../../context/AuthContext";
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Container,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';

const BACKEND_API_BASE_URL = '';

/* ── 공통 다크 인풋 스타일 ── */
const inputStyle = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: '#f4f4f5',
  padding: '12px 16px',
  fontSize: '0.95rem',
  outline: 'none',
  transition: 'border-color 0.2s',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

function UserPage() {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    nickname: '', email: '', currentPassword: '', password: '', confirmPassword: ''
  });

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/api/user`, {
          method: 'GET', headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error("유저 정보 불러오기 실패");
        const data = await res.json();
        setUserInfo(data);
        setEditForm({ nickname: data.nickname || '', email: data.email || '', currentPassword: '', password: '', confirmPassword: '' });
      } catch { setError("유저 정보를 불러오지 못했습니다."); }
      finally { setLoading(false); }
    };
    getUserInfo();
  }, []);

  const toggleEdit = () => {
    setIsEditing(!isEditing);
    if (!isEditing && userInfo) {
      setEditForm({ nickname: userInfo.nickname || '', email: userInfo.email || '', currentPassword: '', password: '', confirmPassword: '' });
    }
  };

  const handleUpdate = async () => {
    if (!userInfo) return;
    const hasPasswordInput = editForm.currentPassword || editForm.password || editForm.confirmPassword;
    if (hasPasswordInput) {
      if (!editForm.currentPassword || !editForm.password || !editForm.confirmPassword) {
        setError("비밀번호 변경 시 현재 비밀번호, 새 비밀번호, 확인을 모두 입력해야 합니다."); return;
      }
      if (editForm.password !== editForm.confirmPassword) {
        setError("새 비밀번호가 일치하지 않습니다."); return;
      }
    }
    try {
      const token = localStorage.getItem("accessToken");
      const body = {
        username: userInfo.username,
        nickname: editForm.nickname,
        email: editForm.email,
        password: editForm.password,
        currentPassword: editForm.currentPassword
      };
      const res = await fetch(`${BACKEND_API_BASE_URL}/api/user`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        alert("회원 정보가 수정되었습니다.");
        setUserInfo({ ...userInfo, nickname: editForm.nickname, email: editForm.email });
        setIsEditing(false);
        setError("");
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || (res.status === 400 || res.status === 409
          ? "이미 사용 중인 닉네임이거나 입력값이 올바르지 않습니다."
          : `수정 실패 (${res.status})`));
      }
    } catch (err) { setError("정보 수정 중 오류 발생: " + err.message); }
  };

  const handleWithdrawal = async () => {
    if (!userInfo) return;
    if (!confirm(t('user.withdraw_confirm'))) return;
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${BACKEND_API_BASE_URL}/api/user`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ username: userInfo.username }),
      });
      if (res.ok) { alert(t('user.withdraw_success')); logout(); navigate('/'); }
      else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || `${t('user.withdraw_fail')} (${res.status})`);
      }
    } catch (err) { setError(t('user.withdraw_error') + err.message); }
  };

  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress sx={{ color: '#818cf8' }} />
    </Box>
  );

  return (
    <>
      <Helmet>
        <title>마이페이지 - TerminalNexus</title>
      </Helmet>

      <Box sx={{ minHeight: '100vh', bgcolor: '#000', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        {/* 배경 글로우 */}
        <Box sx={{
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: '50vw', height: '50vw', maxWidth: 600, maxHeight: 600,
          background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <Container maxWidth="sm" sx={{ pt: { xs: 12, md: 14 }, pb: 10, position: 'relative', zIndex: 1 }}>
          {/* 헤더 */}
          <Box mb={6}>
            <Chip
              label="Account Settings"
              sx={{
                mb: 2, bgcolor: 'rgba(99,102,241,0.08)', color: '#818cf8',
                border: '1px solid rgba(99,102,241,0.22)', fontWeight: 700, fontSize: '0.75rem',
              }}
            />
            <Typography
              variant="h3" fontWeight={800}
              sx={{ color: '#f4f4f5', letterSpacing: '-1.5px', fontSize: { xs: '2rem', md: '2.6rem' } }}
            >
              {t('user.title')}
            </Typography>
          </Box>

          {/* 에러 메시지 */}
          {error && (
            <Box sx={{
              p: 2, mb: 3, borderRadius: '10px',
              bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <Typography sx={{ color: '#fca5a5', fontSize: '0.88rem' }}>{error}</Typography>
            </Box>
          )}

          {!error && userInfo && (
            <Box
              sx={{
                p: { xs: 3, md: 4 }, borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.07)',
                bgcolor: 'rgba(255,255,255,0.02)', backdropFilter: 'blur(8px)',
              }}
            >
              <Stack spacing={3}>
                {/* 아이디 (읽기 전용) */}
                <Box>
                  <Typography sx={{ color: '#52525b', fontSize: '0.75rem', fontWeight: 600, mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {t('user.username')}
                  </Typography>
                  <Box sx={{
                    px: 2, py: 1.5, borderRadius: '10px',
                    bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <Typography sx={{ color: '#a1a1aa', fontSize: '0.95rem', fontFamily: 'monospace' }}>
                      {userInfo.username}
                    </Typography>
                  </Box>
                </Box>

                {/* 닉네임 */}
                <Box>
                  <Typography sx={{ color: '#52525b', fontSize: '0.75rem', fontWeight: 600, mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {t('user.nickname')}
                  </Typography>
                  {isEditing ? (
                    <input
                      style={inputStyle}
                      value={editForm.nickname}
                      onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                      onFocus={e => e.target.style.borderColor = '#818cf8'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  ) : (
                    <Box sx={{ px: 2, py: 1.5, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Typography sx={{ color: '#f4f4f5', fontSize: '0.95rem' }}>{userInfo.nickname}</Typography>
                    </Box>
                  )}
                </Box>

                {/* 이메일 */}
                <Box>
                  <Typography sx={{ color: '#52525b', fontSize: '0.75rem', fontWeight: 600, mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {t('user.email')}
                  </Typography>
                  {isEditing ? (
                    <input
                      type="email" style={inputStyle}
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      onFocus={e => e.target.style.borderColor = '#818cf8'}
                      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  ) : (
                    <Box sx={{ px: 2, py: 1.5, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <Typography sx={{ color: '#f4f4f5', fontSize: '0.95rem' }}>{userInfo.email}</Typography>
                    </Box>
                  )}
                </Box>

                {/* 비밀번호 변경 (편집 시만) */}
                {isEditing && (
                  <>
                    <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                    <Typography sx={{ color: '#52525b', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                      비밀번호 변경 (선택)
                    </Typography>
                    {[
                      { key: 'currentPassword', label: t('user.password_current'), placeholder: '현재 비밀번호' },
                      { key: 'password', label: t('user.password_new'), placeholder: '새로운 비밀번호' },
                      { key: 'confirmPassword', label: t('user.password_confirm'), placeholder: '비밀번호 확인' },
                    ].map(({ key, label, placeholder }) => (
                      <Box key={key}>
                        <Typography sx={{ color: '#52525b', fontSize: '0.72rem', fontWeight: 600, mb: 1, textTransform: 'uppercase', letterSpacing: 1 }}>
                          {label}
                        </Typography>
                        <input
                          type="password" style={inputStyle} placeholder={placeholder}
                          value={editForm[key] || ''}
                          onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                          onFocus={e => e.target.style.borderColor = '#818cf8'}
                          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                        {key === 'confirmPassword' && editForm.password && editForm.confirmPassword && editForm.password !== editForm.confirmPassword && (
                          <Typography sx={{ color: '#f87171', fontSize: '0.78rem', mt: 0.5 }}>비밀번호가 일치하지 않습니다.</Typography>
                        )}
                      </Box>
                    ))}
                  </>
                )}

                {/* 액션 버튼 */}
                <Stack direction="row" spacing={2} pt={1}>
                  {isEditing ? (
                    <>
                      <Button
                        variant="contained" onClick={handleUpdate} sx={{
                          flex: 1, py: 1.4, borderRadius: '10px',
                          bgcolor: '#fff', color: '#000', fontWeight: 700,
                          textTransform: 'none',
                          '&:hover': { bgcolor: '#e4e4e7' },
                        }}
                      >
                        저장
                      </Button>
                      <Button
                        variant="outlined" onClick={toggleEdit} sx={{
                          flex: 1, py: 1.4, borderRadius: '10px',
                          borderColor: 'rgba(255,255,255,0.1)', color: '#a1a1aa',
                          textTransform: 'none',
                          '&:hover': { borderColor: 'rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.04)' },
                        }}
                      >
                        취소
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outlined" onClick={toggleEdit} fullWidth sx={{
                        py: 1.4, borderRadius: '10px',
                        borderColor: 'rgba(255,255,255,0.1)', color: '#a1a1aa',
                        textTransform: 'none',
                        '&:hover': { borderColor: 'rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.04)' },
                      }}
                    >
                      정보 수정
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          )}

          {/* 회원 탈퇴 */}
          <Box mt={4} pt={4} sx={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography sx={{ color: '#3f3f46', fontSize: '0.8rem', mb: 2 }}>
              위험 구역 — 탈퇴 시 모든 데이터가 영구 삭제됩니다.
            </Typography>
            <Button
              variant="outlined" onClick={handleWithdrawal}
              sx={{
                px: 3, py: 1.2, borderRadius: '10px',
                borderColor: 'rgba(239,68,68,0.25)', color: '#f87171',
                textTransform: 'none', fontSize: '0.85rem',
                '&:hover': { borderColor: 'rgba(239,68,68,0.5)', bgcolor: 'rgba(239,68,68,0.06)' },
              }}
            >
              {t('user.withdraw_btn')}
            </Button>
          </Box>
        </Container>
      </Box>
    </>
  );
}

export default UserPage;